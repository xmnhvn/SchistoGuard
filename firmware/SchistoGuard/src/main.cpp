#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
    Serial.begin(9600);
    sensors.begin();
    lcd.begin(16, 2);
    lcd.backlight();
}

void loop() {
    sensors.requestTemperatures();
    float tempC = sensors.getTempCByIndex(0);

    lcd.setCursor(0, 0);
    lcd.print("Temp: ");
    lcd.print(tempC, 2);
    lcd.print(" C   ");

    Serial.println(tempC, 2); // Send to backend
    delay(2000);
}

  int myFunction(int x, int y) {
    return x + y;
  }