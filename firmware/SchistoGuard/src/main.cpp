#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>
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
  
  lcd.clear();
}

void loop() {
  // Handle OTA updates
  ArduinoOTA.handle();

  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  lcd.setCursor(0, 0);
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
    }
    lastSend = millis();
  }

  delay(2000);
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
}