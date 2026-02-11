# CRM Project README

## Overview
This project is a Customer Relationship Management (CRM) system designed to help businesses manage their customer information and interactions.

## Features
- Manage customer data
- Track interactions and communications
- Generate reports
- User authentication and role management

## Prerequisites
Before you begin, ensure you have met the following requirements:
- You have a modern web browser (Chrome, Firefox, Safari, etc.).
- You have [Node.js](https://nodejs.org/) installed on your machine.
- You have access to a terminal or command prompt.

## Installation
Follow these steps to set up the project locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Vikas-Stechies/crm.git
   cd crm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure the environment variables**:
   - Create a `.env` file in the root directory and add your configuration:
     ```makefile
     DATABASE_URL=your_database_url
     JWT_SECRET=your_jwt_secret
     ```

4. **Run the application**:
   ```bash
   npm start
   ```
   - The application should now be running on `http://localhost:3000`.

## Running Tests
To run tests, execute the following command:
```bash
npm test
```

## Contributing
Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Thanks to all the contributors and the open-source community for their unwavering support.