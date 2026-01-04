/**
 * Data Migration Script: JSON Files → PostgreSQL (Neon)
 * Migrates all existing JSON data to PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import database service
const db = require('../services/databaseService');

async function createTables() {
  console.log('📋 Creating database tables...');
  
  const schema = `
    -- Create tables for NxtBus
    CREATE TABLE IF NOT EXISTS buses (
        id VARCHAR(50) PRIMARY KEY,
        number VARCHAR(20) NOT NULL,
        model VARCHAR(100),
        year INTEGER,
        capacity INTEGER,
        fuel_type VARCHAR(20),
        status VARCHAR(20) DEFAULT 'active',
        owner_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS routes (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        start_point VARCHAR(100) NOT NULL,
        end_point VARCHAR(100) NOT NULL,
        start_lat DECIMAL(10, 8),
        start_lon DECIMAL(11, 8),
        end_lat DECIMAL(10, 8),
        end_lon DECIMAL(11, 8),
        estimated_duration INTEGER,
        distance DECIMAL(8, 2),
        fare DECIMAL(8, 2),
        status VARCHAR(20) DEFAULT 'active',
        stops JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS active_trips (
        id VARCHAR(50) PRIMARY KEY,
        trip_id VARCHAR(50) UNIQUE NOT NULL,
        bus_id VARCHAR(50),
        driver_id VARCHAR(50),
        driver_name VARCHAR(100),
        route_id VARCHAR(50),
        route_name VARCHAR(200),
        owner_id VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active',
        start_time TIMESTAMP,
        estimated_end_time TIMESTAMP,
        current_gps JSONB,
        previous_gps JSONB,
        max_speed INTEGER,
        avg_speed INTEGER,
        gps_update_count INTEGER DEFAULT 0,
        overspeed_count INTEGER DEFAULT 0,
        last_overspeed BIGINT,
        last_update BIGINT,
        progress INTEGER DEFAULT 0,
        current_stop_id VARCHAR(50),
        next_stop_id VARCHAR(50),
        estimated_arrival TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS schedules (
        id VARCHAR(50) PRIMARY KEY,
        bus_id VARCHAR(50),
        route_id VARCHAR(50),
        bus_number VARCHAR(20),
        route_name VARCHAR(200),
        driver_name VARCHAR(100),
        start_time TIME,
        end_time TIME,
        days TEXT[],
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        type VARCHAR(50),
        priority VARCHAR(20) DEFAULT 'medium',
        target_audience VARCHAR(50),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS feedbacks (
        id VARCHAR(50) PRIMARY KEY,
        user_name VARCHAR(100),
        user_email VARCHAR(100),
        bus_number VARCHAR(20),
        route_name VARCHAR(200),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        category VARCHAR(50),
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS delays (
        id VARCHAR(50) PRIMARY KEY,
        bus_id VARCHAR(50),
        bus_number VARCHAR(20),
        route_id VARCHAR(50),
        delay_minutes INTEGER,
        reason VARCHAR(200),
        reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS call_alerts (
        id VARCHAR(50) PRIMARY KEY,
        driver_id VARCHAR(50),
        driver_name VARCHAR(100),
        bus_number VARCHAR(20),
        alert_type VARCHAR(50),
        message TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'active'
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
    CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);
    CREATE INDEX IF NOT EXISTS idx_active_trips_status ON active_trips(status);
    CREATE INDEX IF NOT EXISTS idx_active_trips_route ON active_trips(route_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);
    CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
    CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
  `;

  try {
    await db.query(schema);
    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Failed to create tables:', error.message);
    throw error;
  }
}

async function migrateData() {
  console.log('🔄 Starting data migration from JSON files to PostgreSQL...');
  
  const dataDir = path.join(__dirname, '../data');
  
  try {
    // 1. Migrate Buses
    console.log('📦 Migrating buses...');
    const busesFile = path.join(dataDir, 'buses.json');
    if (fs.existsSync(busesFile)) {
      const buses = JSON.parse(fs.readFileSync(busesFile, 'utf8'));
      for (const bus of buses) {
        try {
          await db.query(
            `INSERT INTO buses (id, number, model, year, capacity, fuel_type, owner_id, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             ON CONFLICT (id) DO UPDATE SET 
             number = EXCLUDED.number, model = EXCLUDED.model, year = EXCLUDED.year,
             capacity = EXCLUDED.capacity, fuel_type = EXCLUDED.fuel_type, 
             owner_id = EXCLUDED.owner_id, status = EXCLUDED.status`,
            [bus.id, bus.number, bus.model, bus.year, bus.capacity, bus.fuelType, bus.ownerId, bus.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate bus ${bus.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${buses.length} buses`);
    }

    // 2. Migrate Routes
    console.log('🗺️ Migrating routes...');
    const routesFile = path.join(dataDir, 'routes.json');
    if (fs.existsSync(routesFile)) {
      const routes = JSON.parse(fs.readFileSync(routesFile, 'utf8'));
      for (const route of routes) {
        try {
          await db.query(
            `INSERT INTO routes (id, name, start_point, end_point, start_lat, start_lon, end_lat, end_lon, 
             estimated_duration, distance, fare, stops, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET 
             name = EXCLUDED.name, start_point = EXCLUDED.start_point, end_point = EXCLUDED.end_point,
             start_lat = EXCLUDED.start_lat, start_lon = EXCLUDED.start_lon, end_lat = EXCLUDED.end_lat,
             end_lon = EXCLUDED.end_lon, estimated_duration = EXCLUDED.estimated_duration,
             distance = EXCLUDED.distance, fare = EXCLUDED.fare, stops = EXCLUDED.stops, status = EXCLUDED.status`,
            [route.id, route.name, route.startPoint, route.endPoint, route.startLat, route.startLon, 
             route.endLat, route.endLon, route.estimatedDuration, route.distance, route.fare, 
             JSON.stringify(route.stops), route.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate route ${route.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${routes.length} routes`);
    }

    // 3. Migrate Active Trips
    console.log('🚌 Migrating active trips...');
    const tripsFile = path.join(dataDir, 'activeTrips.json');
    if (fs.existsSync(tripsFile)) {
      const trips = JSON.parse(fs.readFileSync(tripsFile, 'utf8'));
      for (const trip of trips) {
        try {
          await db.query(
            `INSERT INTO active_trips (id, trip_id, bus_id, driver_id, driver_name, route_id, route_name, 
             owner_id, status, start_time, estimated_end_time, current_gps, previous_gps, max_speed, 
             avg_speed, gps_update_count, overspeed_count, last_overspeed, last_update, progress, 
             current_stop_id, next_stop_id, estimated_arrival) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
             ON CONFLICT (trip_id) DO UPDATE SET 
             current_gps = EXCLUDED.current_gps, previous_gps = EXCLUDED.previous_gps,
             last_update = EXCLUDED.last_update, progress = EXCLUDED.progress`,
            [trip.id, trip.tripId, trip.busId, trip.driverId, trip.driverName, trip.routeId, 
             trip.routeName, trip.ownerId, trip.status, trip.startTime, trip.estimatedEndTime,
             JSON.stringify(trip.currentGps), JSON.stringify(trip.previousGps), trip.maxSpeed,
             trip.avgSpeed, trip.gpsUpdateCount, trip.overspeedCount, trip.lastOverspeed,
             trip.lastUpdate, trip.progress, trip.currentStopId, trip.nextStopId, trip.estimatedArrival]
          );
        } catch (error) {
          console.error(`Failed to migrate trip ${trip.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${trips.length} active trips`);
    }

    // 4. Migrate Schedules
    console.log('📅 Migrating schedules...');
    const schedulesFile = path.join(dataDir, 'schedules.json');
    if (fs.existsSync(schedulesFile)) {
      const schedules = JSON.parse(fs.readFileSync(schedulesFile, 'utf8'));
      for (const schedule of schedules) {
        try {
          await db.query(
            `INSERT INTO schedules (id, bus_id, route_id, bus_number, route_name, driver_name, 
             start_time, end_time, days, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET 
             bus_id = EXCLUDED.bus_id, route_id = EXCLUDED.route_id, bus_number = EXCLUDED.bus_number,
             route_name = EXCLUDED.route_name, driver_name = EXCLUDED.driver_name,
             start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, days = EXCLUDED.days`,
            [schedule.id, schedule.busId, schedule.routeId, schedule.busNumber, schedule.routeName,
             schedule.driverName, schedule.startTime, schedule.endTime, schedule.days, schedule.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate schedule ${schedule.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${schedules.length} schedules`);
    }

    // 5. Migrate Notifications
    console.log('📢 Migrating notifications...');
    const notificationsFile = path.join(dataDir, 'notifications.json');
    if (fs.existsSync(notificationsFile)) {
      const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
      for (const notification of notifications) {
        try {
          await db.query(
            `INSERT INTO notifications (id, title, message, type, priority, target_audience, sent_at, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET 
             title = EXCLUDED.title, message = EXCLUDED.message, type = EXCLUDED.type`,
            [notification.id, notification.title, notification.message, notification.type,
             notification.priority || 'medium', notification.targetAudience, notification.sentAt, 
             notification.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate notification ${notification.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${notifications.length} notifications`);
    }

    // 6. Migrate Feedbacks
    console.log('💬 Migrating feedbacks...');
    const feedbacksFile = path.join(dataDir, 'feedbacks.json');
    if (fs.existsSync(feedbacksFile)) {
      const feedbacks = JSON.parse(fs.readFileSync(feedbacksFile, 'utf8'));
      for (const feedback of feedbacks) {
        try {
          await db.query(
            `INSERT INTO feedbacks (id, user_name, user_email, bus_number, route_name, rating, 
             feedback_text, category, submitted_at, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET 
             rating = EXCLUDED.rating, feedback_text = EXCLUDED.feedback_text`,
            [feedback.id, feedback.userName, feedback.userEmail, feedback.busNumber, feedback.routeName,
             feedback.rating, feedback.feedbackText, feedback.category, feedback.submittedAt, 
             feedback.status || 'pending']
          );
        } catch (error) {
          console.error(`Failed to migrate feedback ${feedback.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${feedbacks.length} feedbacks`);
    }

    // 7. Migrate Delays
    console.log('⏰ Migrating delays...');
    const delaysFile = path.join(dataDir, 'delays.json');
    if (fs.existsSync(delaysFile)) {
      const delays = JSON.parse(fs.readFileSync(delaysFile, 'utf8'));
      for (const delay of delays) {
        try {
          await db.query(
            `INSERT INTO delays (id, bus_id, bus_number, route_id, delay_minutes, reason, reported_at, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET 
             delay_minutes = EXCLUDED.delay_minutes, reason = EXCLUDED.reason`,
            [delay.id, delay.busId, delay.busNumber, delay.routeId, delay.delayMinutes, 
             delay.reason, delay.reportedAt, delay.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate delay ${delay.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${delays.length} delays`);
    }

    // 8. Migrate Call Alerts
    console.log('📞 Migrating call alerts...');
    const callAlertsFile = path.join(dataDir, 'callAlerts.json');
    if (fs.existsSync(callAlertsFile)) {
      const callAlerts = JSON.parse(fs.readFileSync(callAlertsFile, 'utf8'));
      for (const alert of callAlerts) {
        try {
          await db.query(
            `INSERT INTO call_alerts (id, driver_id, driver_name, bus_number, alert_type, message, 
             priority, created_at, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET 
             message = EXCLUDED.message, priority = EXCLUDED.priority`,
            [alert.id, alert.driverId, alert.driverName, alert.busNumber, alert.alertType,
             alert.message, alert.priority || 'medium', alert.createdAt, alert.status || 'active']
          );
        } catch (error) {
          console.error(`Failed to migrate call alert ${alert.id}:`, error.message);
        }
      }
      console.log(`✅ Migrated ${callAlerts.length} call alerts`);
    }

    console.log('🎉 Data migration completed successfully!');
    
    // Verify migration
    const counts = await Promise.all([
      db.query('SELECT COUNT(*) FROM buses'),
      db.query('SELECT COUNT(*) FROM routes'),
      db.query('SELECT COUNT(*) FROM active_trips'),
      db.query('SELECT COUNT(*) FROM schedules'),
      db.query('SELECT COUNT(*) FROM notifications'),
      db.query('SELECT COUNT(*) FROM feedbacks'),
      db.query('SELECT COUNT(*) FROM delays'),
      db.query('SELECT COUNT(*) FROM call_alerts')
    ]);

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Buses: ${counts[0].rows[0].count}`);
    console.log(`✅ Routes: ${counts[1].rows[0].count}`);
    console.log(`✅ Active Trips: ${counts[2].rows[0].count}`);
    console.log(`✅ Schedules: ${counts[3].rows[0].count}`);
    console.log(`✅ Notifications: ${counts[4].rows[0].count}`);
    console.log(`✅ Feedbacks: ${counts[5].rows[0].count}`);
    console.log(`✅ Delays: ${counts[6].rows[0].count}`);
    console.log(`✅ Call Alerts: ${counts[7].rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting NxtBus data migration to PostgreSQL...\n');
    
    // Create tables first
    await createTables();
    
    // Then migrate data
    await migrateData();
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('🔗 Your database is ready for production deployment.');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    // Close database connection
    await db.close();
    process.exit(0);
  }
}

// Run migration
main();