// TinyGPS++ integration for Neo-6M GPS (D18=RX, D21=TX)
#include <TinyGPS++.h>

TinyGPSPlus gps;
HardwareSerial gpsSerial(1); // Use UART1 for GPS

void setupGPS() {
  gpsSerial.begin(9600, SERIAL_8N1, 18, 21); // RX=D18, TX=D21
  Serial.println("GPS serial started on D18 (RX), D21 (TX)");
}

void readGPS() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }
}

float getLatitude() {
  if (gps.location.isValid()) {
    return gps.location.lat();
  } else {
    return 0.0;
  }
}

float getLongitude() {
  if (gps.location.isValid()) {
    return gps.location.lng();
  } else {
    return 0.0;
  }
}

bool gpsIsValid() {
  return gps.location.isValid();
}
