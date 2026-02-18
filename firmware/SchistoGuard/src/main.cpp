<<<<<<< HEAD
=======
#include <Arduino.h>
>>>>>>> 0529e0419531226c14f6c99344cc150c251e4849
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
<<<<<<< HEAD
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoOTA.h>

#define ONE_WIRE_BUS 2
#define I2C_SDA 21
#define I2C_SCL 22

// WiFi credentials
const char* ssid = "M I K A T A 6 9";
const char* password = "xFbwzT65";
const char* otaPassword = "SG2026";

// Backend server
const char* serverUrl = "http://192.168.100.11:3001/api/sensors";

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Set the LCD address to 0x27 for a 16 chars and 2 line display
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long lastSend = 0;
const unsigned long sendInterval = 1000;  // Send every 1 second

// Function declaration
void sendDataToBackend(float temperature);

void setup() {
  Serial.begin(115200);
  sensors.begin();

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.begin(16, 2);
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  delay(500);
  lcd.clear();

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
    
    lcd.setCursor(0, 0);
    lcd.print("WiFi: OK");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString().c_str());
    delay(2000);
  } else {
    Serial.println("\nWiFi failed!");
    lcd.setCursor(0, 0);
    lcd.print("WiFi: FAILED");
    delay(2000);
  }

  // Setup OTA
  ArduinoOTA.setPassword(otaPassword);
  
  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH)
      type = "sketch";
    else
      type = "filesystem";
    Serial.println("OTA Start updating " + type);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA Updating...");
  });
  
  ArduinoOTA.onEnd([]() {
    Serial.println("\nOTA End");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA Complete!");
    delay(2000);
  });
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("Progress: %u%%\r", (progress / (total / 100)));
  });
  
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("OTA Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA Error!");
    delay(2000);
  });
  
  ArduinoOTA.begin();
  Serial.println("OTA ready");
  
=======

// Pins (ESP32 GPIO numbers)
const int LCD_SDA = 33; // D33
const int LCD_SCL = 26; // D26
const int ONE_WIRE_BUS = 4; // D4 (temperature)
const int TURBIDITY_PIN = 35; // D35 (ADC)
const int PH_PIN = 34; // D34 (ADC)

// I2C LCD at 0x27
LiquidCrystal_I2C lcd(0x27, 16, 2);
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ADC reference for ESP32 (approx)
const float ADC_MAX = 4095.0; // 12-bit ADC default
const float VREF = 3.3; // ESP32 Vcc

// WHO / DOH recommended thresholds (used as alerts)
// pH: WHO/DOH drinking water guideline: 6.5 - 8.5
const float PH_MIN = 6.5;
const float PH_MAX = 8.5;
// Turbidity: WHO recommends turbidity < 5 NTU for treated water; 15 NTU considered high
const float TURBIDITY_OK = 5.0;   // NTU
const float TURBIDITY_HIGH = 15.0; // NTU
// Temperature: use operational range relevant for schistosomiasis environmental risk monitoring
// (no strict WHO numeric for schisto; use 20-32°C as practical thresholds for snail activity monitoring)
const float TEMP_MIN = 20.0;
const float TEMP_MAX = 32.0;

// Turbidity calibration placeholder: convert measured voltage to NTU
// IMPORTANT: calibrate this constant for your sensor. Default 1.0 assumes sensor outputs NTU directly (unlikely).
const float TURBIDITY_CAL = 1.0; // NTU per volt (placeholder)

void setup() {
  Serial.begin(115200);
  // Initialize I2C on specified pins for ESP32
  Wire.begin(LCD_SDA, LCD_SCL);

  lcd.init();
  lcd.backlight();

  // Display startup screen
  lcd.setCursor(0, 0);
  lcd.print("- SchistoGuard -");
  lcd.setCursor(0, 1);
  lcd.print("   Starting...");
  delay(3000); // Show startup message for 3 seconds

  sensors.begin();

  // ADC pins are input-only by default on ESP32, pinMode not required for analog read
  delay(100);

  Serial.println("ESP32 sensor firmware started");
  
  // Clear LCD and prepare for sensor display
>>>>>>> 0529e0419531226c14f6c99344cc150c251e4849
  lcd.clear();
}

void loop() {
<<<<<<< HEAD
  // Handle OTA updates
  ArduinoOTA.handle();

  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
=======
  // Read temperature (DS18B20)
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  bool tempValid = (tempC != DEVICE_DISCONNECTED_C);

  // Read turbidity
  int turbRaw = analogRead(TURBIDITY_PIN);
  float turbVoltage = turbRaw * (VREF / ADC_MAX);
  // Convert voltage to NTU using calibration constant (user must calibrate)
  float turbidityNTU = turbVoltage * TURBIDITY_CAL;

  // Read pH
  int phRaw = analogRead(PH_PIN);
  float phVoltage = phRaw * (VREF / ADC_MAX);
  // Simple conversion used previously; adjust if your pH sensor uses different scaling
  float phValue = 7.0 + ((2.5 - phVoltage) / 0.18);

  // Determine alert states based on thresholds
  bool alertTemp = tempValid && (tempC < TEMP_MIN || tempC > TEMP_MAX);
  bool alertPH = (phValue < PH_MIN || phValue > PH_MAX);
  bool alertTurbidity = (turbidityNTU > TURBIDITY_HIGH) || (turbidityNTU > TURBIDITY_OK && turbidityNTU <= TURBIDITY_HIGH);
  // Note: above logic flags turbidity > OK as warning and > HIGH as critical
>>>>>>> 0529e0419531226c14f6c99344cc150c251e4849

  // Update LCD — show sensors and simple ALERT indicator
  lcd.clear();
  lcd.setCursor(0, 0);
<<<<<<< HEAD
  lcd.print("Temp: ");
  lcd.print(tempC, 2);
  lcd.print(" C   ");

  lcd.setCursor(0, 1);
  lcd.print("                ");

  Serial.print("Temperature: ");
  Serial.println(tempC);

  // Send data to backend every sendInterval
  if (millis() - lastSend >= sendInterval) {
    if (WiFi.status() == WL_CONNECTED) {
      sendDataToBackend(tempC);
=======
  if (tempValid) {
    lcd.print("T:"); lcd.print(tempC, 1); lcd.print("C ");
  } else {
    lcd.print("T:N/A ");
  }
  lcd.print("pH:"); lcd.print(phValue, 2);

  lcd.setCursor(0, 1);
  lcd.print("Tu:"); lcd.print(turbidityNTU, 1); lcd.print("NTU ");
  if (alertTemp || alertPH || turbidityNTU > TURBIDITY_OK) {
    // Show ALERT tag if any condition outside OK range
    lcd.print("ALRT");
    if (alertTemp) {
      lcd.print(" T");
    }
    if (alertPH) {
      lcd.print(" pH");
    }
    if (turbidityNTU > TURBIDITY_OK) {
      lcd.print(" Tu");
>>>>>>> 0529e0419531226c14f6c99344cc150c251e4849
    }
    lastSend = millis();
  }

  // Print to Serial with details and tags
  Serial.print("TEMP,");
  if (tempValid) Serial.print(tempC, 2); else Serial.print("NaN");
  Serial.print(",PH,"); Serial.print(phValue, 2);
  Serial.print(",TURB_NTU,"); Serial.print(turbidityNTU, 2);

  // Print human-readable alerts
  if (alertTemp) Serial.print(",ALERT_TEMP");
  if (alertPH) Serial.print(",ALERT_PH");
  if (turbidityNTU > TURBIDITY_HIGH) Serial.print(",ALERT_TURBIDITY_HIGH");
  else if (turbidityNTU > TURBIDITY_OK) Serial.print(",ALERT_TURBIDITY_ELEVATED");

  Serial.println();

  // Delay between readings
  delay(2000);
<<<<<<< HEAD
}

void sendDataToBackend(float temperature) {
  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Create JSON payload
  String payload = "{";
  payload += "\"temperature\":" + String(temperature, 2) + ",";
  payload += "\"turbidity\":0,";
  payload += "\"ph\":0,";
  payload += "\"lat\":0,";
  payload += "\"lng\":0,";
  payload += "\"device_ip\":\"" + WiFi.localIP().toString() + "\"";
  payload += "}";

  Serial.print("Sending to backend: ");
  Serial.println(payload);

  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("Response code: ");
    Serial.println(httpResponseCode);
    Serial.println("Response: " + response);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }

  http.end();
=======
>>>>>>> 0529e0419531226c14f6c99344cc150c251e4849
}