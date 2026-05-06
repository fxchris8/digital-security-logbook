package routers

import (
	"net/http"

	"backend/internal/controllers"

	"github.com/gin-gonic/gin"
)

type RouterConfig struct {
	App               *gin.Engine
	LogbookController *controllers.LogbookController
}

func (c *RouterConfig) Setup() {
	c.App.GET("/health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{
			"status":  "healthy",
			"service": "logbook-qr-backend",
		})
	})

	logbook := c.App.Group("/api/logbooks")
	{
		logbook.GET("", c.LogbookController.FindAll)
		logbook.POST("/upload-photo", c.LogbookController.UploadPhoto)
		logbook.POST("/generate-qr", c.LogbookController.GenerateQRCode)
		logbook.GET("/checkout", c.LogbookController.CheckoutByToken)
		logbook.GET("/:id/qr", c.LogbookController.GetQRCode)
		logbook.PUT("/:id", c.LogbookController.Update)
		logbook.DELETE("/:id", c.LogbookController.Delete)
	}
}
