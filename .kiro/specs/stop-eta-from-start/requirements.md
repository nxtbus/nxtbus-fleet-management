# Requirements Document

## Introduction

This feature enhances the QR code scanning experience by displaying the estimated travel time from the route's starting point to the scanned bus stop. When a passenger scans a QR code at a bus stop, in addition to seeing the bus's current ETA, the system will show how long the journey typically takes from the route origin to that stop. This helps passengers understand the route timing and plan their journeys better.

## Glossary

- **Route Start Point**: The first stop/origin of a bus route where the bus begins its journey
- **Scanned Stop**: The bus stop where the passenger scans the QR code
- **Stop ETA from Start**: The estimated time it takes for a bus to travel from the route's start point to the scanned stop
- **QR Scanner**: The component that reads QR codes at bus stops and displays bus information
- **Route Search**: The component where users select from/to locations to find buses

## Requirements

### Requirement 1

**User Story:** As a passenger, I want to see the estimated travel time from the route's start point to my current stop, so that I can understand how long the bus journey takes to reach my location.

#### Acceptance Criteria

1. WHEN a user scans a QR code at a bus stop THEN the system SHALL display the estimated time from the route's start point to that stop
2. WHEN displaying the stop ETA from start THEN the system SHALL calculate the time based on the stop's position in the route and the route's average speed
3. WHEN the scanned stop is the first stop on the route THEN the system SHALL display "0 min" or "Starting Point" as the time from start
4. WHEN displaying the stop information THEN the system SHALL show the stop name, stop order in the route, and the estimated time from start

### Requirement 2

**User Story:** As a passenger using route search, I want to see the estimated travel time from the route start to my pickup point, so that I can understand the bus schedule better.

#### Acceptance Criteria

1. WHEN a user searches for buses from a location THEN the system SHALL display the estimated time from route start to the pickup location
2. WHEN displaying bus results THEN the system SHALL show both the ETA to the user's location AND the time from route start to that location
3. WHEN the pickup location matches the route start THEN the system SHALL indicate this is the starting point of the route

### Requirement 3

**User Story:** As a passenger, I want the time from start calculation to be based on realistic bus travel speeds, so that the estimate is accurate.

#### Acceptance Criteria

1. WHEN calculating time from route start THEN the system SHALL use the route's estimated duration and stop positions to determine timing
2. WHEN a stop has a predefined estimated time in the route data THEN the system SHALL use that value for the time from start
3. WHEN a stop does not have predefined timing THEN the system SHALL calculate the time based on the stop's relative position along the route
