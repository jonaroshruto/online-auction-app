# Online Auction System

A modern, responsive front-end auction system that allows users to bid on luxury items, manage their accounts, and participate in real-time auctions. Built with vanilla JavaScript for optimal performance and simplicity.

## Features

- User authentication (login/register)
- View current and ended auctions
- Real-time bid updates and countdown timers
- Advanced search and filtering options
- Responsive design for all devices
- Local data persistence using localStorage
- Bid history tracking for each item
- Sort auctions by price, end time, or newest
- Modal-based interaction system
- Form validation and error handling

## Project Structure

```
auction-system/
├── index.html          # Main HTML structure
├── css/
│   └── style.css      # All styles and responsive design
├── js/
│   └── main.js        # Core JavaScript functionality
├── db/
│   ├── items.json     # Sample auction items data
│   └── users.json     # Sample user accounts
└── README.md
```

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/jonaroshruto/online-auction-app.git
```

2. Open the project:
   - Use a local server (recommended):
     - VS Code: Install "Live Server" extension and right-click index.html -> "Open with Live Server"
     - Python: Run `python -m http.server` in the project directory
     - Node.js: Use `npx serve` in the project directory
   - Or open index.html directly in a modern browser (some features may be limited)

## Test Accounts

Multiple test accounts are available for testing:

```
Username: demo       Password: demo123
Username: alice      Password: alice123
Username: bob        Password: bob123
Username: seller     Password: seller123
Username: collector  Password: collect123
```

## Features In Detail

### Authentication System
- User registration with validation
- Secure login system
- Persistent sessions using localStorage
- Password requirements enforcement

### Auction Features
- Real-time countdown timers
- Bid history tracking
- Minimum bid enforcement
- Auction end-time validation
- Image gallery for items
- Detailed item descriptions

### Search and Filter
- Text-based search in titles and descriptions
- Sort by:
  - Ending Soon
  - Price (Low to High)
  - Price (High to Low)
  - Newest First

### Responsive Design
- Mobile-first approach
- Flexible grid system
- Adaptive navigation
- Modal responsiveness
- Touch-friendly interfaces

## Technical Implementation

### Data Storage
- Uses localStorage for data persistence
- Fallback to default data if JSON fetch fails
- Automatic data recovery system

### State Management
- Global state management for user sessions
- Real-time UI updates
- Event-driven architecture

### Security Features
- Input validation
- XSS prevention
- Form security measures
- Session management

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS/Android)

## Development Notes

- All data persists in localStorage until manual reset
- New users and bids are stored locally
- Dates are relative to current time
- No backend required - perfect for frontend development and testing
- Modular code structure for easy maintenance

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details

## Acknowledgments

- Placeholder images provided by placeholder.com
- Icons and design inspiration from Material Design
- Testing assistance from the open-source community