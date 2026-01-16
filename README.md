# Adaptive Voice Dialer - Call Center Solution

A professional call center solution built with Next.js, featuring a voice dialer interface, user management, and role-based access control.

## Features

- 🎯 **Smart Dialer UI** - Professional dialer interface with dial pad and call history
- 👥 **User Management** - Admin panel for managing users, roles, and permissions
- 🔐 **Authentication** - Secure authentication with NextAuth.js
- 🛡️ **Route Protection** - Protected routes with role-based access control
- 📊 **State Management** - TanStack Query for efficient data fetching
- 🎨 **Modern UI** - Beautiful UI built with shadcn/ui components
- 🗄️ **MongoDB Integration** - MongoDB for data persistence

## Tech Stack

- **Framework**: Next.js 16.1.2
- **Authentication**: NextAuth.js v4.24.13
- **Database**: MongoDB with Mongoose
- **State Management**: TanStack Query v5.87.1
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Prerequisites

- Node.js 18+ 
- MongoDB (local or cloud instance)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd adaptive-voice-dialer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:

```env
# MongoDB Connection (MongoDB Atlas)
MONGODB_URI=mongodb+srv://zainalis914_db_user:QREaOMRFWfE9khR3@react-dialer.qzddudg.mongodb.net/?appName=react-dialer

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-this-in-production
```

**Note**: Make sure your MongoDB Atlas connection string includes the database name. If needed, append the database name to the connection string:
```
MONGODB_URI=mongodb+srv://...mongodb.net/adaptive-voice-dialer?appName=react-dialer
```

**Important**: Generate a secure random string for `NEXTAUTH_SECRET`. You can use:
```bash
openssl rand -base64 32
```

4. Seed the database with default users:
```bash
npm run seed
```

This will create:
- **Admin**: admin@example.com / admin123
- **Agent**: agent@example.com / agent123
- **User**: user@example.com / user123
- Additional test users

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
adaptive-voice-dialer/
├── src/
│   ├── app/
│   │   ├── (protected)/          # Protected routes
│   │   │   ├── dashboard/        # Dialer page
│   │   │   └── admin/
│   │   │       └── users/        # Admin users management
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/ # NextAuth API
│   │   │   │   └── register/      # Registration API
│   │   │   └── users/            # User CRUD APIs
│   │   ├── login/                 # Login page
│   │   ├── register/              # Registration page
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Landing page
│   ├── components/
│   │   ├── layout/                # Layout components
│   │   └── ui/                    # shadcn/ui components
│   ├── lib/
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── auth-utils.ts          # Auth utility functions
│   │   └── mongodb.ts             # MongoDB connection
│   ├── models/
│   │   └── User.ts                # User model
│   ├── providers/                 # React providers
│   └── types/
│       └── next-auth.d.ts         # NextAuth type definitions
├── scripts/
│   └── seed.ts                    # Database seeder
└── middleware.ts                  # Route protection middleware
```

## User Roles

- **Admin**: Full access to all features including user management
- **Agent**: Access to dialer and call management
- **User**: Basic access to dialer

## API Routes

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/users/[id]` - Get a single user
- `PATCH /api/users/[id]` - Update a user
- `DELETE /api/users/[id]` - Delete a user

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database with default users
- `npm run lint` - Run linter
- `npm run format` - Format code

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_URL` | Base URL of your application | Yes |
| `NEXTAUTH_SECRET` | Secret key for NextAuth | Yes |

## Features in Detail

### Landing Page
- Professional landing page with feature highlights
- Call-to-action buttons for registration and login

### Dialer Interface
- Phone number input with dial pad
- Call history tracking
- Real-time call status
- Keyboard support (Enter to dial)

### User Management (Admin)
- View all users in a table
- Create new users with role assignment
- Edit user information
- Delete users (with confirmation)
- Filter and search capabilities

### Authentication
- Secure login with email and password
- User registration
- Session management
- Protected routes

## Security Features

- Password hashing with bcrypt
- JWT-based session management
- Route protection middleware
- Role-based access control
- Input validation

## Development

The project uses:
- **TypeScript** for type safety
- **Biome** for linting and formatting
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components

## Production Deployment

1. Set up environment variables in your hosting platform
2. Ensure MongoDB is accessible from your hosting environment
3. Build the application: `npm run build`
4. Start the production server: `npm start`

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.
