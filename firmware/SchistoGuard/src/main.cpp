#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
LiquidCrystal_I2C lcd(0x27, 16, 2);

#define TURBIDITY_PIN A0
#define PH_PIN A1

void setup() {
  Serial.begin(9600);
  delay(2000); // Wait for Serial to initialize
  Serial.println("SchistoGuard Starting...");
  
  sensors.begin();
  Serial.print("Found ");
  Serial.print(sensors.getDeviceCount());
  Serial.println(" temperature sensor(s)");
  
  lcd.begin(16, 2);
  lcd.backlight();
  lcd.print("System Ready");
  
  pinMode(TURBIDITY_PIN, INPUT);
  Serial.println("Setup Complete!");
}

void loop() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  int turbidityRaw = analogRead(TURBIDITY_PIN);
  float turbidityVoltage = turbidityRaw * (5.0 / 1023.0);

  int phRaw = analogRead(PH_PIN);
  float phVoltage = phRaw * (5.0 / 1023.0);
  float phValue = 7 + ((2.5 - phVoltage) / 0.18);

  lcd.setCursor(0, 0);
  lcd.print("T:");
  lcd.print(tempC, 2);
  lcd.print("C pH:");
  lcd.print(phValue, 2);

  lcd.setCursor(0, 1);
  lcd.print("Tu:");
  lcd.print(turbidityVoltage, 2);
  lcd.print(" NTU   ");

  Serial.print(tempC, 2);
  Serial.print(",");
  Serial.print(turbidityVoltage, 2);
  Serial.print(",");
  Serial.println(phValue, 2);

  delay(2000);
}