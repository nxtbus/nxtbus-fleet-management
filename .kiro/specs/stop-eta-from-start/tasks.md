# Implementation Plan

- [ ] 1. Add calculateTimeFromStart utility function
  - [ ] 1.1 Create the calculateTimeFromStart function in etaCalculator.js
    - Add function that takes stop and route objects
    - Return minutes, isStartingPoint flag, formatted string, and stop order info
    - Use estimatedTime if available, otherwise calculate from position
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 1.2 Write property test for predefined time usage
    - **Property 1: Predefined time is used when available**
    - **Validates: Requirements 3.2**

  - [ ]* 1.3 Write property test for proportional calculation
    - **Property 2: Calculated time is proportional to stop position**
    - **Validates: Requirements 1.2, 3.1, 3.3**

  - [ ]* 1.4 Write property test for first stop handling
    - **Property 3: First stop returns zero or starting point indicator**
    - **Validates: Requirements 1.3, 2.3**

  - [ ]* 1.5 Write property test for bounds validation
    - **Property 4: Time from start is always non-negative and bounded**
    - **Validates: Requirements 3.1**

- [ ] 2. Update QR Scanner to display time from start
  - [ ] 2.1 Modify QRScanner component to find stop in route data
    - After scanning, look up the stop in the bus's route stops array
    - Match by stop ID or by GPS coordinates proximity
    - _Requirements: 1.1_

  - [ ] 2.2 Add time from start display in stop header
    - Show stop order (e.g., "Stop #2 of 5")
    - Show time from route start (e.g., "⏱️ 15 min from route start")
    - Handle starting point case with appropriate message
    - _Requirements: 1.1, 1.3, 1.4_

- [ ] 3. Update Route Search to display time from start
  - [ ] 3.1 Calculate time from start for pickup location
    - Find the pickup location in route stops
    - Calculate time from start using the utility function
    - _Requirements: 2.1_

  - [ ] 3.2 Add time from start display in bus result cards
    - Show alongside existing ETA information
    - Display "Starting Point" for first stop
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
