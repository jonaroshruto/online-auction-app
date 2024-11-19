# Online Auction System

A modern, responsive front-end auction system that allows users to bid on luxury items, manage their accounts, and participate in real-time auctions. Built with vanilla JavaScript for optimal performance and simplicity.

## Features

- User authentication (login/register) with password visibility toggle
- View current and ended auctions
- Real-time bid updates and countdown timers
- Advanced search and filtering options
- Responsive design for all devices
- Local data persistence using localStorage
- Bid history tracking with detailed metrics
- Sort auctions by ending soon, price, or newest
- Toast notification system
- Enhanced security features
- Admin controls for system management

## Project Structure

```
auction-system/
├── index.html          # Main HTML structure with modals
├── css/
│   └── style.css      # Comprehensive styles with CSS variables
├── js/
│   └── main.js        # Core JavaScript functionality
├── db/
│   ├── items.json     # Sample auction items (20 luxury items)
│   └── users.json     # Sample user accounts (9 test accounts)
├── LICENSE            # MIT License
└── README.md
```

## Test Accounts

The following accounts are available for testing:

```
Admin Account:
Username: admin      Password: admin12    (Has reset functionality)

Regular Accounts:
Username: demo       Password: demo123
Username: alice      Password: alice123
Username: bob        Password: bob123
Username: seller     Password: seller123
Username: collector  Password: collect123
Username: techie     Password: tech123
Username: artlover   Password: art123
Username: vintage    Password: vintage123
```

## Features In Detail

### Authentication System
- User registration with field validation
- Secure login system with password visibility toggle
- Persistent sessions using localStorage
- Password pattern requirements
- Admin privileges for system management

### Auction Features
- Real-time countdown timers
- Detailed bid history with metrics
- Minimum bid enforcement
- Auction end-time validation
- Placeholder images for items
- Comprehensive item descriptions
- Bid status indicators

### Search and Filter
- Text-based search in titles and descriptions
- Sort by:
  - Ending Soon
  - Price (Low to High)
  - Price (High to Low)
  - Newest First

### UI Components
- Toast notification system
- Modal-based interactions
- Password visibility toggles
- Responsive cards with hover effects
- Loading state animations
- Enhanced button styling

### Responsive Design
- Mobile-first approach
- CSS Grid system
- Adaptive navigation
- Modal responsiveness
- Touch-friendly interfaces
- CSS variables for theming

## Technical Implementation

### Data Storage
- Uses localStorage for data persistence
- JSON data structure for items and users
- Automatic data recovery system
- Bid history tracking

### State Management
- Global state management for user sessions
- Real-time UI updates
- Event-driven architecture
- Toast notification system

### Security Features
- Input validation and pattern matching
- XSS prevention
- Form security measures
- Session management
- Password visibility controls

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS/Android)

## Development Notes

- All data persists in localStorage until manual reset
- Admin account can reset auction data
- New users and bids are stored locally
- Dates are relative to current time
- No backend required - perfect for frontend development and testing
- CSS variables for easy theming
- Modular code structure

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Placeholder images provided by placeholder.com
- Icons from Material Design