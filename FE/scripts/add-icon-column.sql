-- Migration script to add icon column to courses table
-- Run this if you have an existing database

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'Calendar' 
AFTER color;

