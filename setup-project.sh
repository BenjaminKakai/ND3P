#!/bin/bash

# Create main directories
mkdir -p config controllers models repositories routes services views middlewares utils public/{css,js,images}

# Create config files
touch config/{db.js,auth.js}

# Create controller files
touch controllers/{authController,storeController,staffController,serviceController,offerController,bookingController}.js

# Create model files
touch models/{User,Store,Staff,Service,Offer,Booking}.js

# Create repository files
touch repositories/{userRepository,storeRepository,staffRepository,serviceRepository,offerRepository,bookingRepository}.js

# Create route files
touch routes/{authRoutes,storeRoutes,staffRoutes,serviceRoutes,offerRoutes,bookingRoutes}.js

# Create service files
touch services/{authService,storeService,staffService,serviceService,offerService,bookingService}.js

# Create view directories
mkdir -p views/{auth,store,staff,service,offer,booking}

# Create middleware files
touch middlewares/{authMiddleware,errorHandler}.js

# Create utility files
touch utils/{email,logger}.js

# Create root files
touch .env .gitignore app.js package.json

# Create basic .gitignore content
echo "node_modules/
.env
.DS_Store
*.log" > .gitignore

# Create basic package.json
echo '{
  "name": "service-provider-system",
  "version": "1.0.0",
  "description": "Service Provider System",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {},
  "devDependencies": {}
}' > package.json

echo "Project structure created successfully!"