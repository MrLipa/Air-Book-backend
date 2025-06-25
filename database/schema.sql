DROP DATABASE IF EXISTS air_book;
CREATE DATABASE air_book;
USE air_book;

-- USERS
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `image` text,
  `phone` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `description` varchar(500) DEFAULT NULL,
  `role` enum('admin','user','none') DEFAULT 'none',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
);

-- NOTIFICATIONS
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `message` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- RESERVATIONS
DROP TABLE IF EXISTS `reservations`;
CREATE TABLE `reservations` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `flight_id` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `reservations_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- TOKENS
DROP TABLE IF EXISTS `tokens`;
CREATE TABLE `tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `refresh_token` text,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
