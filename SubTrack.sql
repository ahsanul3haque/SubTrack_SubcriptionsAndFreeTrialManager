-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 17, 2026 at 06:51 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `SubTrack`
--

-- --------------------------------------------------------

--
-- Table structure for table `Categories`
--

CREATE TABLE `Categories` (
  `CategoryID` int(11) NOT NULL,
  `CategoryName` varchar(80) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Categories`
--

INSERT INTO `Categories` (`CategoryID`, `CategoryName`) VALUES
(1, 'Entertainment'),
(2, 'Music & Audio'),
(3, 'Productivity & Design'),
(4, 'Cloud Storage'),
(5, 'Gaming'),
(6, 'Education'),
(7, 'VPN'),
(8, 'Memberships'),
(9, 'VPN');

-- --------------------------------------------------------

--
-- Table structure for table `Services`
--

CREATE TABLE `Services` (
  `ServiceID` int(11) NOT NULL,
  `ServiceName` varchar(120) NOT NULL,
  `DefaultWebsite` varchar(200) DEFAULT NULL,
  `CategoryID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Services`
--

INSERT INTO `Services` (`ServiceID`, `ServiceName`, `DefaultWebsite`, `CategoryID`) VALUES
(1, 'Netflix', 'https://www.netflix.com', 1),
(2, 'Disney+', 'https://www.disneyplus.com', 1),
(3, 'Hulu', 'https://www.hulu.com', 1),
(4, 'Spotify Premium', 'https://www.spotify.com', 2),
(5, 'Apple Music', 'https://music.apple.com', 2),
(6, 'Onshape', 'https://www.onshape.com', 3),
(7, 'Adobe Creative Cloud', 'https://www.adobe.com', 3),
(8, 'Notion', 'https://www.notion.so', 3),
(9, 'Google One', 'https://one.google.com', 4),
(10, 'Dropbox', 'https://www.dropbox.com', 4),
(11, 'Xbox Game Pass', 'https://www.xbox.com', 5),
(12, 'Duolingo Super', 'https://www.duolingo.com', 6),
(13, 'Custom Service', NULL, 1),
(14, 'ExpressVPN', NULL, 7),
(15, 'Gym', NULL, 8),
(16, 'ExpressVPN', NULL, 9);

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `UserID` int(11) NOT NULL,
  `Name` varchar(100) NOT NULL,
  `Email` varchar(150) NOT NULL,
  `PasswordHash` varchar(255) NOT NULL,
  `JoinDate` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Users`
--

INSERT INTO `Users` (`UserID`, `Name`, `Email`, `PasswordHash`, `JoinDate`) VALUES
(1, 'Ahsanul Haque', 'ahsanul@student.nsu.edu', 'demo123', '2026-01-15'),
(2, 'Nafisa Nawal Erisha', 'erisha@student.nsu.edu', 'demo123', '2026-01-16'),
(3, 'John Doe', 'john.doe@email.com', 'demo123', '2026-02-10'),
(4, 'Jane Smith', 'jane.smith@email.com', 'demo123', '2026-02-22'),
(5, 'Michael Scott', 'mscott@dundermifflin.com', 'demo123', '2026-03-05'),
(6, 'Empty Tester', 'notrials@email.com', 'demo123', '2026-03-25');

-- --------------------------------------------------------

--
-- Table structure for table `User_Subscriptions`
--

CREATE TABLE `User_Subscriptions` (
  `SubscriptionID` int(11) NOT NULL,
  `BillingAmount` decimal(10,2) NOT NULL,
  `BillingCycle` varchar(20) NOT NULL,
  `NextBillingDate` date NOT NULL,
  `IsFreeTrial` tinyint(1) NOT NULL DEFAULT 0,
  `Status` varchar(20) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `ServiceID` int(11) DEFAULT NULL,
  `AutoRenew` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `User_Subscriptions`
--

INSERT INTO `User_Subscriptions` (`SubscriptionID`, `BillingAmount`, `BillingCycle`, `NextBillingDate`, `IsFreeTrial`, `Status`, `UserID`, `ServiceID`, `AutoRenew`) VALUES
(3, 10.99, 'Monthly', '2026-05-17', 0, 'Active', 1, 4, 1),
(4, 13.99, 'Monthly', '2026-04-20', 0, 'Active', 2, 2, 1),
(5, 29.99, 'Yearly', '2027-01-16', 0, 'Active', 2, 9, 1),
(7, 16.99, 'Monthly', '2026-04-10', 0, 'Active', 3, 11, 1),
(8, 15.49, 'Monthly', '2026-03-10', 0, 'Expired', 3, 1, 1),
(9, 10.99, 'Monthly', '2026-04-10', 0, 'Active', 3, 5, 1),
(10, 54.99, 'Monthly', '2026-04-22', 0, 'Active', 4, 7, 1),
(11, 100.00, 'Yearly', '2027-02-22', 0, 'Active', 4, 8, 1),
(12, 11.99, 'Monthly', '2026-04-22', 0, 'Active', 4, 10, 1),
(13, 13.99, 'Monthly', '2026-04-05', 0, 'Active', 5, 2, 1),
(14, 7.99, 'Monthly', '2026-04-05', 0, 'Active', 5, 3, 1),
(15, 10.99, 'Monthly', '2026-01-05', 0, 'Canceled', 5, 4, 1),
(16, 16.99, 'Monthly', '2026-04-05', 0, 'Active', 5, 11, 1),
(18, 21.99, 'Monthly', '2026-05-01', 0, 'Active', 1, 1, 1),
(19, 17.99, 'Monthly', '2026-05-18', 0, 'Active', 1, 2, 1),
(22, 9.99, '7 Days', '2026-04-22', 1, 'Active', 1, 4, 0),
(23, 12.49, '14 Days', '2026-12-17', 0, 'Active', 1, 3, 1),
(24, 15.49, 'Monthly', '2026-03-17', 0, 'Canceled', 1, 1, 0),
(25, 77.99, 'Yearly', '2025-04-15', 0, 'Expired', 1, 15, 0),
(26, 7.99, 'Monthly', '2026-03-15', 0, 'Expired', 1, 8, 0),
(27, 9.99, 'Monthly', '2026-05-17', 0, 'Active', 1, 9, 1),
(29, 14.99, '7 Days', '2026-03-24', 1, 'Canceled', 1, 4, 1),
(31, 199.99, 'Yearly', '2027-04-17', 0, 'Active', 1, 16, 0),
(33, 12.99, 'Monthly', '2026-05-17', 1, 'Active', 1, 5, 0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Categories`
--
ALTER TABLE `Categories`
  ADD PRIMARY KEY (`CategoryID`);

--
-- Indexes for table `Services`
--
ALTER TABLE `Services`
  ADD PRIMARY KEY (`ServiceID`),
  ADD KEY `CategoryID` (`CategoryID`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `Email` (`Email`);

--
-- Indexes for table `User_Subscriptions`
--
ALTER TABLE `User_Subscriptions`
  ADD PRIMARY KEY (`SubscriptionID`),
  ADD KEY `UserID` (`UserID`),
  ADD KEY `ServiceID` (`ServiceID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Categories`
--
ALTER TABLE `Categories`
  MODIFY `CategoryID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `Services`
--
ALTER TABLE `Services`
  MODIFY `ServiceID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `User_Subscriptions`
--
ALTER TABLE `User_Subscriptions`
  MODIFY `SubscriptionID` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `Services`
--
ALTER TABLE `Services`
  ADD CONSTRAINT `services_ibfk_1` FOREIGN KEY (`CategoryID`) REFERENCES `Categories` (`CategoryID`);

--
-- Constraints for table `User_Subscriptions`
--
ALTER TABLE `User_Subscriptions`
  ADD CONSTRAINT `user_subscriptions_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `Users` (`UserID`),
  ADD CONSTRAINT `user_subscriptions_ibfk_2` FOREIGN KEY (`ServiceID`) REFERENCES `Services` (`ServiceID`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
