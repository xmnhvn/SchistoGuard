#include <SoftwareSerial.h>
#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <TinyGPSPlus.h>

#define SIM800_TX 7
#define SIM800_RX 8
SoftwareSerial sim800l(SIM800_TX, SIM800_RX);

#define GPS_RX 10
#define GPS_TX 11
SoftwareSerial gpsSerial(GPS_RX, GPS_TX);
TinyGPSPlus gps;

String smsRecipient = "+639053167929";
#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
LiquidCrystal_I2C lcd(0x27, 16, 2);

#define TURBIDITY_PIN A0
#define PH_PIN A1

void setup() {
  Serial.begin(9600);
  sim800l.begin(9600);
  gpsSerial.begin(9600);
  delay(1000);
  sim800l.println("AT");
  delay(1000);
  printSIM800LResponse();
  sim800l.println("AT+CMGF=1");
  delay(1000);
  printSIM800LResponse();
  void printSIM800LResponse() {
    while (sim800l.available()) {
      Serial.write(sim800l.read());
    }
  }
  sensors.begin();
  lcd.begin(16, 2);
  lcd.backlight();
  pinMode(TURBIDITY_PIN, INPUT);

  Serial.println("SMS_SENT:TEST");
}

void loop() {
  // Read GPS data
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

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

  // Always send sensor data with GPS (or NaN if no fix)
  if (gps.location.isValid()) {
      Serial.print(tempC, 2); Serial.print(",");
      Serial.print(turbidityVoltage, 2); Serial.print(",");
      Serial.print(phValue, 2); Serial.print(",");
      Serial.print(gps.location.lat(), 6); Serial.print(",");
      Serial.println(gps.location.lng(), 6);
  } else {
      Serial.print(tempC, 2); Serial.print(",");
      Serial.print(turbidityVoltage, 2); Serial.print(",");
      Serial.print(phValue, 2); Serial.print(",");
      Serial.println("NaN,NaN");
  }

  if (Serial.available()) {
    String alerts = "";
    while (Serial.available()) {
      String line = Serial.readStringUntil('\n');
      line.trim();
      if (line.length() > 0) {
        if (alerts.length() > 0) alerts += "\n";
        alerts += line;
      }
      delay(10);
    }
    if (alerts.length() > 0) {
      Serial.print("[DEBUG] Received alert stream for SMS:\n");
      Serial.println(alerts);
      String formattedSMS = formatAlerts(alerts);
      sendSMS(formattedSMS);
    }
  }

  delay(2000);
}

void sendSMS(String message) {
  sim800l.println("AT+CMGS=\"" + smsRecipient + "\"");
  delay(1000);
  sim800l.print(message);
  delay(500);
  sim800l.write(26);
  delay(3000);
  printSIM800LResponse();
  Serial.print("SMS_SENT:");
  Serial.print(smsRecipient);
  Serial.print(":");
  Serial.println(message);
}

String formatAlerts(String alerts) {
  String sms = "ALERTS:\n";
  int start = 0;
  while (start < alerts.length()) {
    int end = alerts.indexOf('\n', start);
    if (end == -1) end = alerts.length();
    String line = alerts.substring(start, end);
    if (line.startsWith("Turbidity:")) {
      float turb = line.substring(10).toFloat();
      if (turb < 5) sms += "Turbidity is too low (" + String(turb, 2) + " NTU)\n";
      else if (turb > 15) sms += "Turbidity is too high (" + String(turb, 2) + " NTU)\n";
      else sms += "Turbidity is normal (" + String(turb, 2) + " NTU)\n";
    } else if (line.startsWith("pH:")) {
      float ph = line.substring(3).toFloat();
      if (ph < 6.5) sms += "pH is too low (" + String(ph, 2) + ")\n";
      else if (ph > 8.5) sms += "pH is too high (" + String(ph, 2) + ")\n";
      else sms += "pH is normal (" + String(ph, 2) + ")\n";
    } else if (line.startsWith("Temperature:")) {
      float temp = line.substring(12).toFloat();
      if (temp < 20) sms += "Temperature is too low (" + String(temp, 2) + "C)\n";
      else if (temp > 32) sms += "Temperature is too high (" + String(temp, 2) + "C)\n";
      else sms += "Temperature is normal (" + String(temp, 2) + "C)\n";
    } else {
      sms += line + "\n";
    }
    start = end + 1;
  }
  return sms;
}