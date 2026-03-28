#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ESPmDNS.h>
#include <math.h>
#include "gps_module.h"
#include "config.h"
#define CLOUD_BACKEND_URL "https://schistoguard-production.up.railway.app/api/sensors"

const int LCD_SDA = 33; // D33
const int LCD_SCL = 26; // D26
const int ONE_WIRE_BUS = 4; // D4 (temperature)
const int TURBIDITY_PIN = 35; // D35 (ADC)
const int PH_PIN = 34; // D34 (ADC)
const int GSM_TX = 23; // D23 (to SIM800L RX)
const int GSM_RX = 22; // D22 (from SIM800L TX)

LiquidCrystal_I2C lcd(0x27, 16, 2);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ADC reference for ESP32
const float ADC_MAX = 4095.0; // 12-bit ADC default
const float VREF = 3.3;

// WHO/DOH Schistosomiasis Risk Thresholds
// Temperature: Optimal range for schistosome-transmitting snail activity and cercariae survival
const float TEMP_HIGH_RISK_MIN = 25.0;  // °C - High risk zone start
const float TEMP_HIGH_RISK_MAX = 30.0;  // °C - High risk zone end
const float TEMP_MOD_RISK_MIN = 20.0;   // °C - Moderate risk zone start
const float TEMP_MOD_RISK_MAX = 32.0;   // °C - Moderate risk zone end

// pH: Optimal range for schistosome-transmitting snails (slightly alkaline)
// WHO/DOH standard: 6.5-8.0 = high risk, 6.0-6.5 or 8.0-8.5 = moderate, <6.0 or >8.5 = safe
const float PH_HIGH_RISK_MIN = 6.5;     // Optimal snail habitat start
const float PH_HIGH_RISK_MAX = 8.0;     // Optimal snail habitat end
const float PH_MOD_RISK_MIN = 6.0;      // Moderate snail survival
const float PH_MOD_RISK_MAX = 8.5;      // Moderate snail survival

// Turbidity: Lower turbidity indicates slow/stagnant water (higher schisto risk)
const float TURBIDITY_CLEAR = 5.0;      // NTU - Clear water (potential schisto habitat)
const float TURBIDITY_MODERATE = 15.0;  // NTU - Moderate clarity

// Turbidity calibration placeholder: convert measured voltage to NTU
// IMPORTANT: calibrate this constant for your sensor. Default 1.0 assumes sensor outputs NTU directly (unlikely).
const float TURBIDITY_CAL = 1.0; // NTU per volt (placeholder)

// Heuristic thresholds to detect floating ADC when turbidity sensor is unplugged
const int TURB_SAMPLES = 12;
const float TURB_FLOAT_STDDEV = 300.0; // ADC counts
const int PH_SAMPLES = 12;
const float PH_FLOAT_STDDEV = 300.0; // ADC counts

int currentWiFiIndex = -1;

bool otaReady = false;
bool otaInProgress = false;
unsigned long lastWifiRetryMs = 0;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

WebServer server(80);

HardwareSerial gsmSerial(2);
bool gsmReady = false;
unsigned long lastSMSTime = 0;
const unsigned long SMS_COOLDOWN_MS = 300000;

float latestTempC = 0.0;
bool latestTempValid = false;
float latestPH = 0.0;
bool latestPHConnected = false;
float latestTurbidity = 0.0;
bool latestTurbConnected = false;

int readAnalogAverage(int pin, int samples, float &stddev) {
  long sum = 0;
  long sumSq = 0;
  for (int i = 0; i < samples; i++) {
    int value = analogRead(pin);
    sum += value;
    sumSq += (long)value * (long)value;
    delay(2);
  }

  float mean = (float)sum / samples;
  float variance = ((float)sumSq / samples) - (mean * mean);
  if (variance < 0) variance = 0;
  stddev = sqrtf(variance);
  return (int)(mean + 0.5f);
}

void initGSM() {
  Serial.println("\n=== INITIALIZING GSM/SIM800L ===");
  Serial.print("GSM_TX pin: "); Serial.println(GSM_TX);
  Serial.print("GSM_RX pin: "); Serial.println(GSM_RX);
  
  gsmSerial.begin(9600, SERIAL_8N1, GSM_RX, GSM_TX);
  Serial.println("✓ GSM serial port opened at 9600 baud");
  delay(2000);
  
  // Flush buffers
  while (gsmSerial.available()) gsmSerial.read();
  delay(500);
  
  for (int attempt = 1; attempt <= 5; attempt++) {
    Serial.print("Attempt ");
    Serial.print(attempt);
    Serial.println(": Sending AT");
    
    gsmSerial.flush();
    delay(200);
    
    gsmSerial.write("AT\r\n", 4);
    delay(100);
    gsmSerial.flush();
    
    delay(1000);
    
    char response[128] = {0};
    unsigned long timeout = millis() + 3000;
    int bytesRead = 0;
    while (millis() < timeout && bytesRead < 120) {
      if (gsmSerial.available()) {
        char c = gsmSerial.read();
        response[bytesRead++] = c;
        Serial.write(c);
        timeout = millis() + 100;
      }
    }
    response[bytesRead] = '\0';
    
    Serial.print("\nResponse length: ");
    Serial.print(bytesRead);
    Serial.print(" bytes: ");
    Serial.println(response);
    
    if (strstr(response, "OK") != nullptr) {
      Serial.println("✅ SIM800L responded to AT");
      gsmReady = true;
      
      delay(500);
      gsmSerial.flush();
      delay(200);
      
      Serial.println("Setting SMS text mode (AT+CMGF=1)...");
      gsmSerial.write("AT+CMGF=1\r\n", 11);
      delay(100);
      gsmSerial.flush();
      delay(1000);
      
      Serial.println("=== GSM INITIALIZATION COMPLETE ===\n");
      return;
    }
  }
  
  Serial.println("\n❌ SIM800L NOT RESPONDING after 5 attempts");
  Serial.println("DIAGNOSTIC CHECKLIST:");
  Serial.println("  1. Is SIM800L powered? (check power LED)");
  Serial.println("  2. Is power 3.7-4.2V with 2A capability?");
  Serial.println("  3. Are D22/D23 pins connected correctly?");
  Serial.println("  4. Try swapping D22 and D23 TX/RX pins");
  Serial.println("  5. Check cable connections (loose wires?)");
  Serial.println("=== GSM INITIALIZATION FAILED ===\n");
  gsmReady = false;
}

void decodeJSONString(char* buffer, size_t maxLen) {
  char decoded[512] = {0};
  size_t srcIdx = 0;
  size_t dstIdx = 0;
  
  while (buffer[srcIdx] != '\0' && dstIdx < maxLen - 1) {
    if (buffer[srcIdx] == '\\' && buffer[srcIdx + 1] != '\0') {
      char nextChar = buffer[srcIdx + 1];
      if (nextChar == 'n') {
        decoded[dstIdx++] = '\n';
        srcIdx += 2;
      } else if (nextChar == 'r') {
        decoded[dstIdx++] = '\r';
        srcIdx += 2;
      } else if (nextChar == 't') {
        decoded[dstIdx++] = '\t';
        srcIdx += 2;
      } else if (nextChar == '"') {
        decoded[dstIdx++] = '"';
        srcIdx += 2;
      } else if (nextChar == '\\') {
        decoded[dstIdx++] = '\\';
        srcIdx += 2;
      } else {
        decoded[dstIdx++] = buffer[srcIdx++];
      }
    } else {
      decoded[dstIdx++] = buffer[srcIdx++];
    }
  }
  decoded[dstIdx] = '\0';
  
  strncpy(buffer, decoded, maxLen - 1);
  buffer[maxLen - 1] = '\0';
}

void sendSMS(String message, const char* phoneNumber) {
  if (!gsmReady) {
    Serial.println("❌ GSM not ready, cannot send SMS");
    return;
  }
  
  if (phoneNumber == nullptr || strlen(phoneNumber) == 0) {
    Serial.println("❌ No phone number provided, skipping SMS");
    return;
  }
  
  char msgBuffer[512] = {0};
  message.toCharArray(msgBuffer, sizeof(msgBuffer));
  decodeJSONString(msgBuffer, sizeof(msgBuffer));
  
  Serial.print("📱 Sending SMS to ");
  Serial.print(phoneNumber);
  Serial.print(": ");
  Serial.println(msgBuffer);
  
  while (gsmSerial.available()) {
    gsmSerial.read();
  }
  
  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(phoneNumber);
  gsmSerial.println("\"");
  delay(1500);
  
  gsmSerial.print(msgBuffer);
  delay(200);
  gsmSerial.write(26);
  delay(5000);
  
  char response[256] = {0};
  unsigned long timeout = millis() + 10000;
  int bytesRead = 0;
  while (gsmSerial.available() && millis() < timeout && bytesRead < 250) {
    response[bytesRead++] = (char)gsmSerial.read();
    delay(10);
  }
  response[bytesRead] = '\0';
  
  Serial.print("   Response: ");
  Serial.println(response);
  
  if (strstr(response, "OK") != nullptr || strstr(response, "+CMGS") != nullptr) {
    Serial.print("✅ SMS sent to ");
    Serial.println(phoneNumber);
  } else {
    Serial.print("❌ SMS failed to ");
    Serial.println(phoneNumber);
  }
}

void connectWiFiAndSetupOTA() {
  otaReady = false;
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setHostname(OTA_HOSTNAME);
  
  bool connected = false;
  for (int attempt = 0; attempt < NUM_WIFI_NETWORKS && !connected; attempt++) {
    int i = (PREFERRED_WIFI_INDEX + attempt) % NUM_WIFI_NETWORKS;

    Serial.print("Trying WiFi: ");
    Serial.println(WIFI_NETWORKS[i].ssid);
    
    WiFi.begin(WIFI_NETWORKS[i].ssid, WIFI_NETWORKS[i].password);
    
    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED && (millis() - start) < 10000) {
      delay(250);
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      connected = true;
      currentWiFiIndex = i;
      Serial.print("Connected to: ");
      Serial.println(WIFI_NETWORKS[i].ssid);
      break;
    } else {
      Serial.println("Failed to connect");
    }
  }

  if (connected) {
    ArduinoOTA.setHostname(OTA_HOSTNAME);

    if (strlen(OTA_PASSWORD) > 0) {
      ArduinoOTA.setPassword(OTA_PASSWORD);
      Serial.println("✓ OTA authentication enabled");
    } else {
      Serial.println("⚠️  WARNING: OTA updates without password protection!");
    }

    ArduinoOTA.onStart([]() {
      otaInProgress = true;
      Serial.println("OTA start");
    });
    ArduinoOTA.onEnd([]() {
      otaInProgress = false;
      Serial.println("OTA end");
    });
    ArduinoOTA.onError([](ota_error_t error) {
      otaInProgress = false;
      Serial.printf("OTA error [%u]\n", error);
    });

    ArduinoOTA.begin();
    
    if (MDNS.begin(OTA_HOSTNAME)) {
      Serial.print("mDNS responder started: ");
      Serial.print(OTA_HOSTNAME);
      Serial.println(".local");
      MDNS.addService("http", "tcp", 80);
    } else {
      Serial.println("Error setting up mDNS responder");
    }
    
    server.on("/api/sensors", HTTP_GET, []() {
      String json = "{";
      json += "\"temperature\":" + String(latestTempValid ? latestTempC : -999, 2) + ",";
      json += "\"tempValid\":" + String(latestTempValid ? "true" : "false") + ",";
      json += "\"pH\":" + String(latestPHConnected ? latestPH : -999, 2) + ",";
      json += "\"phConnected\":" + String(latestPHConnected ? "true" : "false") + ",";
      json += "\"turbidity\":" + String(latestTurbConnected ? latestTurbidity : -999, 2) + ",";
      json += "\"turbConnected\":" + String(latestTurbConnected ? "true" : "false");
      json += "}";
      server.send(200, "application/json", json);
    });
    
    server.on("/api/sms", HTTP_POST, []() {
      Serial.println("🔔 /api/sms endpoint called");
      
      String body = "";
      if (server.hasArg("plain")) {
        body = server.arg("plain");
      }
      
      Serial.print("   Body: ");
      Serial.println(body);
      
      if (body.length() == 0) {
        Serial.println("   ❌ Empty body");
        server.send(400, "application/json", "{\"error\":\"Empty body\"}");
        return;
      }
      
      String message = "";
      int msgStart = body.indexOf("\"message\":\"") + 11;
      int msgEnd = body.indexOf("\"", msgStart);
      if (msgStart > 10 && msgEnd > msgStart) {
        message = body.substring(msgStart, msgEnd);
      }
      
      Serial.print("   Message: ");
      Serial.println(message);
      
      String phoneStr = "";
      int phoneStart = body.indexOf("\"phone\":\"") + 9;
      int phoneEnd = body.indexOf("\"", phoneStart);
      if (phoneStart > 8 && phoneEnd > phoneStart) {
        phoneStr = body.substring(phoneStart, phoneEnd);
      }
      
      Serial.print("   Phone: ");
      Serial.println(phoneStr);

      if (phoneStr.length() > 0 && message.length() > 0) {
        Serial.println("   Sending SMS...");
        char phoneBuffer[20];
        phoneStr.toCharArray(phoneBuffer, sizeof(phoneBuffer));
        sendSMS(message, phoneBuffer);
        server.send(200, "application/json", "{\"success\":true}");
        return;
      }
      
      Serial.println("   ❌ Invalid message or phone");
      server.send(400, "application/json", "{\"error\":\"Invalid message or phone\"}");
    });
    
    server.begin();
    
    otaReady = true;
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("OTA hostname: ");
    Serial.println(OTA_HOSTNAME);
    Serial.println("HTTP server started on port 80");
  } else {
    Serial.println("WiFi connect failed. OTA disabled.");
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(LCD_SDA, LCD_SCL);

  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("- SchistoGuard -");
  lcd.setCursor(0, 1);
  lcd.print("   Starting...");
  delay(3000);

  sensors.begin();
  connectWiFiAndSetupOTA();
  initGSM();

  setupGPS();

  lcd.clear();
  lcd.setCursor(0, 0);
  if (otaReady) {
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
  } else {
    lcd.print("WiFi Failed");
    lcd.setCursor(0, 1);
    lcd.print("Check Config");
  }
  delay(5000);

  delay(100);

  Serial.println("ESP32 sensor firmware started");
  
  lcd.clear();
}

void loop() {
  readGPS();

  if (!otaReady && (millis() - lastWifiRetryMs >= WIFI_RETRY_INTERVAL_MS)) {
    lastWifiRetryMs = millis();
    connectWiFiAndSetupOTA();
  }

  if (otaReady && WiFi.status() == WL_CONNECTED) {
    ArduinoOTA.handle();
    server.handleClient();
  } else if (otaReady && WiFi.status() != WL_CONNECTED) {
    otaReady = false;
    otaInProgress = false;
    Serial.println("WiFi lost. OTA paused.");
  }

  if (otaInProgress) {
    ArduinoOTA.handle();
    delay(1);
    return;
  }

  // Read temperature (DS18B20)
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  bool tempValid = (tempC != DEVICE_DISCONNECTED_C);
  latestTempC = tempC;
  latestTempValid = tempValid;

  // Read turbidity
  float turbStdDev = 0.0;
  int turbRaw = readAnalogAverage(TURBIDITY_PIN, TURB_SAMPLES, turbStdDev);
  float turbVoltage = turbRaw * (VREF / ADC_MAX);
  // Analog Turbidity Module at 3.3V: linear mapping 0-3.3V to 0-14 NTU
  float turbidityNTU = turbVoltage / 0.236;
  bool turbSensorConnected = (turbStdDev <= TURB_FLOAT_STDDEV);

  // Read pH
  float phStdDev = 0.0;
  int phRaw = readAnalogAverage(PH_PIN, PH_SAMPLES, phStdDev);
  float phVoltage = phRaw * (VREF / ADC_MAX);
  // PH4502C at 3.3V supply: linear mapping 0-3.3V to 0-14 pH
  float phValue = phVoltage * (14.0 / VREF);
  bool phSensorConnected = (phStdDev <= PH_FLOAT_STDDEV);
  latestPH = phValue;
  latestPHConnected = phSensorConnected;
  latestTurbidity = turbidityNTU;
  latestTurbConnected = turbSensorConnected;

  if (otaReady && WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(CLOUD_BACKEND_URL);
    http.addHeader("Content-Type", "application/json");
    String payload = "{";
    payload += "\"temperature\":" + String(tempValid ? tempC : -999, 2) + ",";
    payload += "\"turbidity\":" + String(turbSensorConnected ? turbidityNTU : -999, 2) + ",";
    payload += "\"ph\":" + String(phSensorConnected ? phValue : -999, 2) + ",";
    payload += "\"device_ip\":\"" + WiFi.localIP().toString() + "\",";
    if (gpsIsValid()) {
      payload += "\"latitude\":" + String(getLatitude(), 6) + ",";
      payload += "\"longitude\":" + String(getLongitude(), 6);
    } else {
      payload += "\"latitude\":null,\"longitude\":null";
    }
    payload += "}";
    int httpResponseCode = http.POST(payload);
    Serial.print("POST /api/sensors: ");
    Serial.println(httpResponseCode);
    http.end();
  }
  
  Serial.print("DEBUG pH_StdDev=");
  Serial.print(phStdDev, 1);
  Serial.print(" Turb_StdDev=");
  Serial.print(turbStdDev, 1);
  Serial.print(" ");

  // Determine schistosomiasis risk based on thresholds
  bool alertTemp = tempValid && (tempC >= TEMP_HIGH_RISK_MIN && tempC <= TEMP_HIGH_RISK_MAX);
  bool alertPH = phSensorConnected && (phValue >= PH_HIGH_RISK_MIN && phValue <= PH_HIGH_RISK_MAX);
  bool alertTurbidity = turbSensorConnected && (turbidityNTU < TURBIDITY_CLEAR); // Clear water = higher schisto risk

  // Update LCD — show sensor values only
  lcd.clear();
  lcd.setCursor(0, 0);
  if (tempValid) {
    lcd.print("T:"); lcd.print(tempC, 1); lcd.print("C ");
  } else {
    lcd.print("T:N/A ");
  }
  lcd.print("pH:");
  if (phSensorConnected) {
    lcd.print(phValue, 2);
  } else {
    lcd.print("N/A");
  }

  lcd.setCursor(0, 1);
  lcd.print("Tu:");
  if (turbSensorConnected) {
    lcd.print(turbidityNTU, 1); lcd.print("NTU");
  } else {
    lcd.print("N/A");
  }

  Serial.print("TEMP,");
  if (tempValid) Serial.print(tempC, 2); else Serial.print("NaN");
  Serial.print(",PH,");
  if (phSensorConnected) Serial.print(phValue, 2); else Serial.print("NaN");
  Serial.print(",TURB_NTU,");
  if (turbSensorConnected) Serial.print(turbidityNTU, 2); else Serial.print("NaN");
  if (!phSensorConnected) Serial.print(",PH_SENSOR_DISCONNECTED");
  if (!turbSensorConnected) Serial.print(",TURB_SENSOR_DISCONNECTED");

  if (alertTemp) Serial.print(",ALERT_TEMP_HIGH_RISK");
  if (alertPH) Serial.print(",ALERT_PH_HIGH_RISK");
  if (alertTurbidity) Serial.print(",ALERT_CLEAR_WATER");

  Serial.println();

  for (int i = 0; i < 10; i++) {
    if (otaReady && WiFi.status() == WL_CONNECTED) {
      ArduinoOTA.handle();
      server.handleClient();
    }
    delay(100);
  }
}