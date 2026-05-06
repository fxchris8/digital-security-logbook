package config

import (
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
	"gorm.io/gorm"

	"backend/internal/controllers"
	"backend/internal/repositories"
	"backend/internal/routers"
	"backend/internal/services"
)

type BootstrapConfig struct {
	DB       *gorm.DB
	App      *gin.Engine
	Log      *logrus.Logger
	Validate *validator.Validate
	Config   *viper.Viper
}

func Bootstrap(config *BootstrapConfig) {
	ensureLogbookSchema(config.DB, config.Log)

	logbookRepository := repositories.NewLogbookRepository()
	logbookService := services.NewLogbookService(
		config.DB,
		config.Log,
		logbookRepository,
		config.Config.GetString("JWT_SECRET_KEY"),
		config.Config.GetString("BACKEND_PUBLIC_URL"),
		config.Config.GetString("APP_TIMEZONE"),
		config.Config.GetString("UPLOAD_DIR"),
		config.Config.GetInt64("MAX_UPLOAD_SIZE"),
	)
	logbookController := controllers.NewLogbookController(logbookService, config.Log)

	routerConfig := &routers.RouterConfig{
		App:               config.App,
		LogbookController: logbookController,
	}
	routerConfig.Setup()

	config.Log.Info("Application bootstrap completed successfully")
}
