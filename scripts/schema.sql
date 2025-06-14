-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS savvy;

-- Use the database
USE savvy;

-- Create hotels table
CREATE TABLE IF NOT EXISTS hotels (
  id VARCHAR(36) PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  url TEXT,
  total_reviews INT DEFAULT 0,
  negative_reviews INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) PRIMARY KEY,
  hotel_id VARCHAR(36) NOT NULL,
  title VARCHAR(255),
  text TEXT NOT NULL,
  score DECIMAL(3,1) NOT NULL,
  date DATE,
  traveler_type VARCHAR(100),
  nationality VARCHAR(100),
  issues TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Create issues table
CREATE TABLE IF NOT EXISTS issues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id VARCHAR(36) NOT NULL,
  issue VARCHAR(100) NOT NULL,
  count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Create SDR strategies table
CREATE TABLE IF NOT EXISTS sdr_strategies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id VARCHAR(36) NOT NULL,
  pitch TEXT NOT NULL,
  pain_points TEXT NOT NULL,
  estimated_value TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  UNIQUE KEY (hotel_id)
);
