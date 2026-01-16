# FreeDash 2.0 🚀

> **Free Minecraft Server Hosting Panel** - A complete, production-ready panel for creating and managing Minecraft servers with a beautiful UI, gamified economy, and powerful admin tools.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB)](https://reactjs.org/)

![FreeDash Banner](https://via.placeholder.com/1200x300/1a1a2e/ffffff?text=FreeDash+2.0+-+Minecraft+Hosting+Panel)

---

## 🌟 What is FreeDash 2.0?

**FreeDash 2.0** is a comprehensive Minecraft server hosting panel that allows users to create, manage, and play on Minecraft servers through an intuitive web interface. It features a **coin-based economy**, **arcade games**, **plugin marketplace**, and **powerful administrative tools** - making it perfect for hosting providers, communities, and Minecraft enthusiasts.

### ✨ Key Highlights

- 🎮 **One-Click Server Creation** - Deploy Minecraft servers in seconds
- 🔌 **Plugin Marketplace** - Install 1000+ plugins from Modrinth & Spigot
- 💰 **Gamified Economy** - Earn coins through games, AFK zone, and Discord rewards
- 🎨 **Live Theme Customization** - 8 customizable colors with 6 beautiful presets
- 📱 **Fully Responsive** - Perfect on mobile, tablet, and desktop
- 🤖 **Discord Integration** - Automated rewards for invites and boosts
- 📢 **Ad Platform** - Built-in monetization system
- ⚡ **Real-Time Console** - Live server logs and command execution

---

## 🚀 Features

### 🖥️ Server Management

<details>
<summary><b>Complete Server Control</b></summary>

- ✅ **Live Console** with real-time log streaming
- ✅ **Power Controls** (Start, Stop, Restart, Kill)
- ✅ **File Manager** (Upload, Edit, Delete files)
- ✅ **Plugin Manager** - Search and install from Modrinth & Spigot
- ✅ **Version Switcher** - Paper & Spigot versions
- ✅ **Properties Editor** - Visual server.properties configuration
- ✅ **Resource Upgrades** - Add RAM, CPU, Disk on-demand
- ✅ **EULA Auto-Detection** - One-click acceptance popup

</details>

### 💰 Economy System

<details>
<summary><b>Coin-Based Economy & Rewards</b></summary>

**Ways to Earn Coins:**
- 💤 **AFK Zone** - Idle to earn automatically
- 🎲 **Arcade Games** - Dice Roll, Coin Flip, Slot Machine
- 💬 **Discord Rewards** - Invite & boost tier rewards
- 🎁 **Promo Codes** - Admin-created reward codes

**Spend Coins On:**
- Create new servers
- Upgrade server resources (RAM, CPU, Disk)
- Purchase advertisement slots

</details>

### 🎨 Admin Panel

<details>
<summary><b>Full Administrative Control</b></summary>

- 👥 **User Management** - Edit, ban, add/remove coins
- 🖥️ **Server Management** - View and control all servers
- 📋 **Plan Creation** - Unlimited custom server plans
- 🎨 **Live Theme Editor** - 8 colors, 6 presets, instant updates
- 📧 **SMTP Configuration** - Email verification system
- 🤖 **Discord Bot Setup** - Automated reward system
- 💵 **Pricing Controls** - RAM/CPU/Disk pricing
- 📢 **Ad Management** - Approve and monitor campaigns

</details>

### 📢 Advertisement Platform

<details>
<summary><b>Monetization Built-In</b></summary>

- 11 premium ad zones across the panel
- Purchase slots with coins
- HTML & image support
- Click & impression tracking
- Priority rotation system
- Admin approval workflow
- Performance analytics

</details>

### 🔔 Real-Time Notifications

- WebSocket-powered instant updates
- Server status changes
- Transaction confirmations
- Game wins/losses
- Admin announcements
- **Privacy:** Users only see their own notifications

---

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API
- **TypeScript** - Type safety
- **Prisma** - Database ORM (PostgreSQL)
- **JWT** - Authentication
- **WebSocket** - Real-time updates
- **Discord.js** - Bot integration
- **Node-Cron** - Scheduled tasks

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Axios** - HTTP client
- **Framer Motion** - Animations

### Infrastructure
- **Pterodactyl Panel** - Server backend (Wings)
- **PostgreSQL** - Database
- **SMTP** - Email service

---

## 📦 Installation

### Prerequisites

- Node.js >= 16.0.0
- PostgreSQL >= 13
- Pterodactyl Panel (with Wings installed)
- SMTP server (for emails)
- Discord Bot (optional, for rewards)

### Quick Start

```bash
# Clone repository
git clone https://github.com/mrshadow-in/freedash2.0.git
cd freedash2.0

# Install backend dependencies
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your settings

# Run database migration
npx prisma migrate dev
npx prisma generate

# Start backend server
npm run dev

# In another terminal - Install frontend dependencies
cd ../frontend
npm install

# Start frontend dev server
npm run dev
```

### Environment Variables

Create `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/freedash"
JWT_SECRET="your-super-secret-jwt-key"
PORT=3000

# Pterodactyl Configuration
PTERODACTYL_URL="https://panel.yourdomain.com"
PTERODACTYL_API_KEY="your-pterodactyl-api-key"

# SMTP Configuration (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Discord Bot (Optional)
DISCORD_BOT_TOKEN="your-discord-bot-token"
```

---

## 🎮 Usage

### For End Users

1. **Register** and verify email
2. **Earn coins** through AFK zone or games
3. **Create a server** by choosing a plan
4. **Install plugins** from the marketplace
5. **Manage** via the live console
6. **Share** the server IP with friends!

### For Admins

1. Navigate to `/admin` (admin role required)
2. **Configure branding** - logo, colors, social links
3. **Create server plans** with custom resources
4. **Set pricing** for RAM/CPU/Disk upgrades
5. **Enable Discord rewards** for community growth
6. **Manage users** and servers
7. Monitor statistics and revenue

---

## 📸 Screenshots

### Dashboard
![Dashboard](./docs/images/dashboard.png)
*Beautiful dashboard showing server stats, coins balance, and quick actions*

### Live Console
![Console](./docs/images/console.png)
*Real-time server console with live logs, statistics, and command execution*

![Console Interface](./docs/images/console-interface.png)
*FreeDash console showing server stats, power controls, and live terminal output*

### Plugin Marketplace
![Plugins](./docs/images/plugins.png)
*Browse and install 1000+ plugins from Modrinth and Spigot*

---

## 🎯 Use Cases

### For Hosting Providers
- Launch a free/freemium Minecraft hosting service
- Generate revenue through advertisements and premium plans
- Automated user management and billing

### For Communities
- Provide servers to Discord members
- Reward community engagement (invites, boosts)
- Build a self-sustaining hosting platform

### For Individuals
- Host multiple servers for different game modes
- Test plugins in isolated environments
- Share servers with friends easily

---

## 🔒 Security Features

- ✅ **JWT Authentication** with refresh tokens
- ✅ **Email Verification** system
- ✅ **Password Hashing** with bcrypt
- ✅ **Rate Limiting** on API endpoints
- ✅ **CORS Protection**
- ✅ **SQL Injection Prevention** (Prisma ORM)
- ✅ **XSS Protection** on user inputs
- ✅ **Role-Based Access Control** (User/Admin)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write clean, documented code
- Test thoroughly before submitting
- Update README if adding new features

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 💝 Support

If you find this project helpful, consider:

- ⭐ **Starring** the repository
- 🐛 **Reporting bugs** via Issues
- 💡 **Suggesting features** via Discussions
- 🤝 **Contributing** code or documentation

---

## 📧 Contact

- **GitHub Issues**: [Report bugs or request features](https://github.com/mrshadow-in/freedash2.0/issues)
- **Discord**: [Join our community](https://discord.gg/your-invite)
- **Email**: support@yourdomain.com

---

## 🙏 Acknowledgments

- **Pterodactyl Panel** - Server management backend
- **Modrinth** & **Spigot** - Plugin APIs
- **Discord.js** - Bot framework
- **React Community** - Frontend tools

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/mrshadow-in/freedash2.0?style=social)
![GitHub forks](https://img.shields.io/github/forks/mrshadow-in/freedash2.0?style=social)
![GitHub watchers](https://img.shields.io/github/watchers/mrshadow-in/freedash2.0?style=social)

---

<p align="center">
  <b>Made with ❤️ for the Minecraft community</b>
  <br>
  <sub>Start hosting. Start earning. Start gaming. 🚀</sub>
</p>

---

## 🗺️ Roadmap

- [ ] Multi-language support (i18n)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Backup/restore system
- [ ] Custom domain support
- [ ] Payment gateway integration
- [ ] Server templates marketplace
- [ ] Two-factor authentication

---

**[⬆ Back to Top](#freedash-20-)**
