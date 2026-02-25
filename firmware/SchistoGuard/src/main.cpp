#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <WiFi.h>
#include <ArduinoOTA.h>
#include <math.h>

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

// Heuristic thresholds to detect floating ADC when turbidity sensor is unplugged
const int TURB_SAMPLES = 12;
const float TURB_FLOAT_STDDEV = 300.0; // ADC counts
const int PH_SAMPLES = 12;
const float PH_FLOAT_STDDEV = 300.0; // ADC counts

// Wi-Fi settings for OTA (replace with your network credentials)
const char* WIFI_SSID = "M I K A T A 6 9";
const char* WIFI_PASSWORD = "xFbwzT65";
const char* OTA_HOSTNAME = "schistoguard-esp32";
const char* OTA_PASSWORD = "";

bool otaReady = false;
bool otaInProgress = false;
unsigned long lastWifiRetryMs = 0;
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

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

void connectWiFiAndSetupOTA() {
  otaReady = false;
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setHostname(OTA_HOSTNAME);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < 15000) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    ArduinoOTA.setHostname(OTA_HOSTNAME);
    if (strlen(OTA_PASSWORD) > 0) {
      ArduinoOTA.setPassword(OTA_PASSWORD);
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
    otaReady = true;
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("OTA hostname: ");
    Serial.println(OTA_HOSTNAME);
  } else {
    Serial.println("WiFi connect failed. OTA disabled.");
  }
}

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
  connectWiFiAndSetupOTA();

  // Display WiFi status on LCD
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
  delay(3000); // Show WiFi status for 3 seconds

  // ADC pins are input-only by default on ESP32, pinMode not required for analog read
  delay(100);

  Serial.println("ESP32 sensor firmware started");
  
  // Clear LCD and prepare for sensor display
  lcd.clear();
}

void loop() {
  if (!otaReady && (millis() - lastWifiRetryMs >= WIFI_RETRY_INTERVAL_MS)) {
    lastWifiRetryMs = millis();
    connectWiFiAndSetupOTA();
  }

  if (otaReady && WiFi.status() == WL_CONNECTED) {
    ArduinoOTA.handle();
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

  // Read turbidity
  float turbStdDev = 0.0;
  int turbRaw = readAnalogAverage(TURBIDITY_PIN, TURB_SAMPLES, turbStdDev);
  float turbVoltage = turbRaw * (VREF / ADC_MAX);
  // Convert voltage to NTU using calibration constant (user must calibrate)
  float turbidityNTU = turbVoltage * TURBIDITY_CAL;
  bool turbSensorConnected = (turbStdDev <= TURB_FLOAT_STDDEV);

  // Read pH
  float phStdDev = 0.0;
  int phRaw = readAnalogAverage(PH_PIN, PH_SAMPLES, phStdDev);
  float phVoltage = phRaw * (VREF / ADC_MAX);
  // Simple conversion used previously; adjust if your pH sensor uses different scaling
  float phValue = 7.0 + ((2.5 - phVoltage) / 0.18);
  bool phSensorConnected = (phStdDev <= PH_FLOAT_STDDEV);
  
  // Debug: print pH stddev
  Serial.print("DEBUG pH_StdDev=");
  Serial.print(phStdDev, 1);
  Serial.print(" Turb_StdDev=");
  Serial.print(turbStdDev, 1);
  Serial.print(" ");

  // Determine alert states based on thresholds
  bool alertTemp = tempValid && (tempC < TEMP_MIN || tempC > TEMP_MAX);
  bool alertPH = phSensorConnected && (phValue < PH_MIN || phValue > PH_MAX);
  bool alertTurbidity = turbSensorConnected && ((turbidityNTU > TURBIDITY_HIGH) || (turbidityNTU > TURBIDITY_OK && turbidityNTU <= TURBIDITY_HIGH));

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

  // Print to Serial with details and tags
  Serial.print("TEMP,");
  if (tempValid) Serial.print(tempC, 2); else Serial.print("NaN");
  Serial.print(",PH,");
  if (phSensorConnected) Serial.print(phValue, 2); else Serial.print("NaN");
  Serial.print(",TURB_NTU,");
  if (turbSensorConnected) Serial.print(turbidityNTU, 2); else Serial.print("NaN");
  if (!phSensorConnected) Serial.print(",PH_SENSOR_DISCONNECTED");
  if (!turbSensorConnected) Serial.print(",TURB_SENSOR_DISCONNECTED");

  // Print human-readable alerts
  if (alertTemp) Serial.print(",ALERT_TEMP");
  if (alertPH) Serial.print(",ALERT_PH");
  if (alertTurbidity && turbidityNTU > TURBIDITY_HIGH) Serial.print(",ALERT_TURBIDITY_HIGH");
  else if (alertTurbidity && turbidityNTU > TURBIDITY_OK) Serial.print(",ALERT_TURBIDITY_ELEVATED");

  Serial.println();

  // Delay between readings
  for (int i = 0; i < 20; i++) {
    if (otaReady && WiFi.status() == WL_CONNECTED) {
      ArduinoOTA.handle();
    }
    delay(100);
  }
}