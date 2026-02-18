#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <OneWire.h>
#include <DallasTemperature.h>

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
  lcd.clear();
}

void loop() {
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

  // Update LCD — show sensors and simple ALERT indicator
  lcd.clear();
  lcd.setCursor(0, 0);
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
    }
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
}