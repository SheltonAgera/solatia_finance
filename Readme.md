Solatia Finance 

Solatia Finance is a real-time stock market alert system designed to help retail investors detect short-term, non-fundamental price movements.

This repository represents the Version 2.0 migration of the project. We have moved from a legacy Python-based architecture to a modern React (Frontend) and Node.js (Backend) stack to address previous issues with data latency and scalability.

Project Goals

The primary objective of this migration is to fix the bottlenecks found in the previous iteration:
* Eliminate Data Latency: Moving to an event-driven Node.js architecture to ensure alerts are truly real-time.
* Improve Scalability: Handling concurrent user requests and high-frequency market data streams more efficiently.
* Enhanced Analytics: A totally revamped UI for better visualization of stock trends.

Tech Stack

Frontend
* React.js: For a dynamic, responsive user interface.
* Chart.js / Recharts: For rendering real-time stock graphs.
* Tailwind CSS: For rapid, clean UI styling.

Backend
* Node.js & Express: Handles API requests and business logic.
* WebSockets (Socket.io): For pushing live stock updates to the client without polling.
* Database: (Add your specific DB here, e.g., MongoDB/PostgreSQL)

Key Features
* Live Alerts: Instant notifications for price spikes or drops.
* Short-term Analysis: Algorithms tuned to detect non-fundamental market movements.
* Dashboard: Real-time visualization of tracked assets.
* User Management: Secure login and profile settings.