#pragma once
#include <TinyGPS++.h>

extern TinyGPSPlus gps;
extern HardwareSerial gpsSerial;

void setupGPS();
void readGPS();
float getLatitude();
float getLongitude();
bool gpsIsValid();
