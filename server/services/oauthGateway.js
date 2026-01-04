/**
 * OAuth Gateway Service for NxtBus
 * Handles OAuth2 authentication with multiple providers
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const OAuth2Strategy = require('passport-oauth2');
const jwt = require('jsonwebtoken');
const { logAuthEvent, logSecurityEvent } = require('../utils/logger');

class OAuthGateway {
  constructor() {
    this.providers = new Map();
    this.apiKeys = new Map();
    this.setupPassport();
  }

  /**
   * Initialize OAuth providers
   */
  setupPassport() {
    // Serialize user for session
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    passport.deserializeUser((user, done) => {
      done(null, user);
    });

    // Setup Google OAuth
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
      }, this.handleOAuthCallback.bind(this, 'google')));
      
      this.providers.set('google', {
        name: 'Google',
        strategy: 'google',
        scope: ['profile', 'email']
      });
      
      console.log('🔐 Google OAuth configured');
    }

    // Setup GitHub OAuth
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || '/api/auth/github/callback'
      }, this.handleOAuthCallback.bind(this, 'github')));
      
      this.providers.set('github', {
        name: 'GitHub',
        strategy: 'github',
        scope: ['user:email']
      });
      
      console.log('🔐 GitHub OAuth configured');
    }

    // Setup custom OAuth2 provider
    if (process.env.CUSTOM_OAUTH_CLIENT_ID && process.env.CUSTOM_OAUTH_CLIENT_SECRET) {
      passport.use('custom-oauth', new OAuth2Strategy({
        authorizationURL: process.env.CUSTOM_OAUTH_AUTH_URL,
        tokenURL: process.env.CUSTOM_OAUTH_TOKEN_URL,
        clientID: process.env.CUSTOM_OAUTH_CLIENT_ID,
        clientSecret: process.env.CUSTOM_OAUTH_CLIENT_SECRET,
        callbackURL: process.env.CUSTOM_OAUTH_CALLBACK_URL || '/api/auth/custom/callback'
      }, this.handleOAuthCallback.bind(this, 'custom')));
      
      this.providers.set('custom', {
        name: 'Custom OAuth',
        strategy: 'custom-oauth',
        scope: ['profile', 'email']
      });
      
      console.log('🔐 Custom OAuth configured');
    }
  }

  /**
   * Handle OAuth callback from providers
   */
  async handleOAuthCallback(provider, accessToken, refreshToken, profile, done) {
    try {
      const userProfile = {
        id: profile.id,
        provider,
        email: profile.emails?.[0]?.value,
        name: profile.displayName || profile.username,
        avatar: profile.photos?.[0]?.value,
        accessToken,
        refreshToken,
        profile: profile._json
      };

      // Check if user exists in our system
      const existingUser = await this.findOrCreateUser(userProfile);
      
      logAuthEvent('OAUTH_LOGIN_SUCCESS', existingUser.id, {
        provider,
        email: userProfile.email,
        name: userProfile.name
      });

      return done(null, existingUser);
    } catch (error) {
      logAuthEvent('OAUTH_LOGIN_FAILED', null, {
        provider,
        error: error.message,
        profile: profile.id
      });
      return done(error, null);
    }
  }

  /**
   * Find or create user from OAuth profile
   */
  async findOrCreateUser(profile) {
    // This would typically interact with your database
    // For now, we'll create a mock user
    const user = {
      id: `oauth_${profile.provider}_${profile.id}`,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      provider: profile.provider,
      role: 'user', // Default role for OAuth users
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      oauthProfile: {
        providerId: profile.id,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken
      }
    };

    return user;
  }

  /**
   * Generate API key for authenticated users
   */
  generateApiKey(userId, permissions = ['read']) {
    const apiKey = `nxtbus_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    const keyData = {
      key: apiKey,
      userId,
      permissions,
      createdAt: Date.now(),
      lastUsed: null,
      requestCount: 0,
      rateLimit: {
        requests: 1000,
        window: 60 * 60 * 1000 // 1 hour
      }
    };

    this.apiKeys.set(apiKey, keyData);
    
    logSecurityEvent('API_KEY_GENERATED', {
      userId,
      permissions,
      keyId: apiKey.substr(-8)
    });

    return {
      apiKey,
      permissions,
      rateLimit: keyData.rateLimit
    };
  }

  /**
   * Validate API key
   */
  validateApiKey(apiKey) {
    const keyData = this.apiKeys.get(apiKey);
    if (!keyData) {
      return null;
    }

    // Update usage statistics
    keyData.lastUsed = Date.now();
    keyData.requestCount++;

    return {
      userId: keyData.userId,
      permissions: keyData.permissions,
      rateLimit: keyData.rateLimit
    };
  }

  /**
   * Revoke API key
   */
  revokeApiKey(apiKey, userId) {
    const keyData = this.apiKeys.get(apiKey);
    if (keyData && keyData.userId === userId) {
      this.apiKeys.delete(apiKey);
      
      logSecurityEvent('API_KEY_REVOKED', {
        userId,
        keyId: apiKey.substr(-8)
      });
      
      return true;
    }
    return false;
  }

  /**
   * Get user's API keys
   */
  getUserApiKeys(userId) {
    const userKeys = [];
    this.apiKeys.forEach((keyData, apiKey) => {
      if (keyData.userId === userId) {
        userKeys.push({
          keyId: apiKey.substr(-8),
          permissions: keyData.permissions,
          createdAt: keyData.createdAt,
          lastUsed: keyData.lastUsed,
          requestCount: keyData.requestCount
        });
      }
    });
    return userKeys;
  }

  /**
   * OAuth middleware for Express routes
   */
  getOAuthRoutes() {
    const routes = [];

    this.providers.forEach((config, provider) => {
      // Auth route
      routes.push({
        method: 'GET',
        path: `/api/auth/${provider}`,
        handler: passport.authenticate(config.strategy, { scope: config.scope })
      });

      // Callback route
      routes.push({
        method: 'GET',
        path: `/api/auth/${provider}/callback`,
        handler: [
          passport.authenticate(config.strategy, { failureRedirect: '/login?error=oauth_failed' }),
          this.handleOAuthSuccess.bind(this)
        ]
      });
    });

    return routes;
  }

  /**
   * Handle successful OAuth authentication
   */
  handleOAuthSuccess(req, res) {
    try {
      // Generate JWT token for the authenticated user
      const token = jwt.sign(
        {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          provider: req.user.provider
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // Redirect to frontend with token
      const redirectUrl = process.env.OAUTH_SUCCESS_REDIRECT || 'http://localhost:5173';
      res.redirect(`${redirectUrl}?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        avatar: req.user.avatar,
        provider: req.user.provider
      }))}`);
    } catch (error) {
      logSecurityEvent('OAUTH_TOKEN_GENERATION_FAILED', {
        userId: req.user?.id,
        error: error.message
      });
      res.redirect('/login?error=token_generation_failed');
    }
  }

  /**
   * API key authentication middleware
   */
  authenticateApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required',
        code: 'API_KEY_REQUIRED'
      });
    }

    const keyData = this.validateApiKey(apiKey);
    if (!keyData) {
      logSecurityEvent('INVALID_API_KEY_USED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        keyId: apiKey.substr(-8)
      });
      
      return res.status(401).json({
        success: false,
        message: 'Invalid API key',
        code: 'INVALID_API_KEY'
      });
    }

    // Add user info to request
    req.user = {
      id: keyData.userId,
      role: 'api_user',
      permissions: keyData.permissions,
      authMethod: 'api_key'
    };

    next();
  }

  /**
   * Check API key permissions
   */
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user || !req.user.permissions) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('admin')) {
        logSecurityEvent('PERMISSION_DENIED', {
          userId: req.user.id,
          requiredPermission: permission,
          userPermissions: req.user.permissions,
          path: req.path
        });
        
        return res.status(403).json({
          success: false,
          message: `Permission '${permission}' required`,
          code: 'PERMISSION_DENIED'
        });
      }

      next();
    };
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders() {
    const providers = [];
    this.providers.forEach((config, key) => {
      providers.push({
        id: key,
        name: config.name,
        authUrl: `/api/auth/${key}`
      });
    });
    return providers;
  }

  /**
   * OAuth status endpoint
   */
  getOAuthStatus() {
    return {
      enabled: this.providers.size > 0,
      providers: this.getAvailableProviders(),
      apiKeyAuth: true,
      features: {
        multiProvider: this.providers.size > 1,
        apiKeys: true,
        permissions: true,
        rateLimit: true
      }
    };
  }
}

// Create singleton instance
const oauthGateway = new OAuthGateway();

module.exports = oauthGateway;