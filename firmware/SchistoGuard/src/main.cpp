#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Turbidity sensor pin

#define TURBIDITY_PIN A0
#define PH_PIN A1

void setup() {
  Serial.begin(9600);
  sensors.begin();
  lcd.begin(16, 2);
  lcd.backlight();
  pinMode(TURBIDITY_PIN, INPUT);
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);


  // Read turbidity sensor value
  int turbidityRaw = analogRead(TURBIDITY_PIN);
  float turbidityVoltage = turbidityRaw * (5.0 / 1023.0);

  // Read pH sensor value
  int phRaw = analogRead(PH_PIN);
  // Example conversion: pH = 7 + ((2.5 - voltage) / 0.18)
  float phVoltage = phRaw * (5.0 / 1023.0);
  float phValue = 7 + ((2.5 - phVoltage) / 0.18); // Adjust calibration as needed

  // LCD format:
  // Line 1: Te:x.xxC pH:zz.zz
  // Line 2: Tu:yyNTU
  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(tempC, 2);
  lcd.print("C pH:");
  lcd.print(phValue, 2);

  lcd.setCursor(0, 1);
  lcd.print("Tu:");
  lcd.print(turbidityVoltage, 2);
  lcd.print(" NTU   ");

  // Send all values to backend, comma-separated
  Serial.print(tempC, 2);
  Serial.print(",");
  Serial.print(turbidityVoltage, 2);
  Serial.print(",");
  Serial.println(phValue, 2);

  delay(2000);
}

  int myFunction(int x, int y) {
    return x + y;
  }