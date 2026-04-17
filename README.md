# SubTrack - Subcriptions And Free Trial Manager
A full-stack web application built with JS, PHP, and MySQL designed to track software subscriptions, manage free trials, and visualize weekly, monthly or yearly expenses. Built for CSE311L (Database Systems Lab) at North South University.

## ✨ Features
* **Smart Dashboard:** Calculates monthly and yearly financial projections.
* **Free Trial Tracker:** Highlights trials expiring within 7 days.
* **Auto-Renew Engine:** Background "Lazy Evaluation" automatically pushes billing dates forward or expires past-due plans.
* **Dynamic State Validation:** Prevents logical paradoxes (e.g., setting a past date while forcing an "Active" status).
* **Data Visualization:** Uses Chart.js for category and billing cycle breakdowns.

## 🛠️ Tech Stack
* **Frontend:** Vanilla HTML, CSS, JavaScript (ES6+), Chart.js
* **Backend:** PHP 8.x
* **Database:** MySQL

## 🚀 How to Run Locally
Because this project uses a PHP backend, it cannot be hosted statically on GitHub Pages. To run it:
1. Download and install [XAMPP](https://www.apachefriends.org/).
2. Clone or download this repository into your `xampp/htdocs` folder.
3. Open XAMPP Control Panel and start **Apache** and **MySQL**.
4. Go to `http://localhost/phpmyadmin` and create a database named `subtrack`.
5. Import the included `subtrack.sql` file to build the tables.
6. Open `http://localhost/subtrack` in your browser.
