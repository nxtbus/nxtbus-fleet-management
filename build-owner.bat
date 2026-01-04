@echo off
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot
cd android-owner
gradlew.bat assembleDebug
pause