package controllers

import (
	"errors"
	"fmt"
	"net/http"

	"backend/internal/models/web"
	"backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/sirupsen/logrus"
)

type LogbookController struct {
	Log     *logrus.Logger
	Service *services.LogbookService
}

func NewLogbookController(service *services.LogbookService, log *logrus.Logger) *LogbookController {
	return &LogbookController{
		Log:     log,
		Service: service,
	}
}

func (controller *LogbookController) FindAll(ctx *gin.Context) {
	var request web.LogbookListRequest

	if err := ctx.ShouldBindQuery(&request); err != nil {
		errs, ok := err.(validator.ValidationErrors)
		if !ok {
			ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
				Code:   http.StatusBadRequest,
				Status: "Bad Request",
				Error:  err.Error(),
			})
			return
		}

		errorMessages := make(map[string]string)
		for _, e := range errs {
			switch e.Field() {
			case "AnchorID":
				errorMessages["anchor_id"] = "is invalid"
			case "Page":
				errorMessages["page"] = "must be one of: next prev"
			case "PageSize":
				errorMessages["page_size"] = "must be between 1 and 200"
			default:
				errorMessages[e.Field()] = "is invalid"
			}
		}

		ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
			Code:   http.StatusBadRequest,
			Status: "Bad Request",
			Error:  errorMessages,
		})
		return
	}

	response, err := controller.Service.FindAll(ctx, &request)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, web.ErrorResponse{
			Code:   http.StatusInternalServerError,
			Status: "Internal Server Error",
			Error:  err.Error(),
		})
		return
	}

	ctx.JSON(response.Code, response)
}

func (controller *LogbookController) UploadPhoto(ctx *gin.Context) {
	file, err := ctx.FormFile("file")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
			Code:   http.StatusBadRequest,
			Status: "Bad Request",
			Error:  "file foto wajib diupload",
		})
		return
	}

	response, err := controller.Service.UploadPhoto(ctx.Request.Context(), file)
	if err != nil {
		statusCode, statusText := logbookErrorStatus(err)

		ctx.JSON(statusCode, web.ErrorResponse{
			Code:   statusCode,
			Status: statusText,
			Error:  err.Error(),
		})
		return
	}

	ctx.JSON(response.Code, response)
}

func (controller *LogbookController) GenerateQRCode(ctx *gin.Context) {
	var request web.GenerateLogbookQRRequest

	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
			Code:   http.StatusBadRequest,
			Status: "Bad Request",
			Error:  err.Error(),
		})
		return
	}

	response, err := controller.Service.GenerateQRCode(ctx, &request)
	if err != nil {
		statusCode, statusText := logbookErrorStatus(err)
		ctx.JSON(statusCode, web.ErrorResponse{
			Code:   statusCode,
			Status: statusText,
			Error:  err.Error(),
		})
		return
	}

	ctx.JSON(response.Code, response)
}

func (controller *LogbookController) Update(ctx *gin.Context) {
	var request web.UpdateLogbookRequest
	if err := ctx.ShouldBindJSON(&request); err != nil {
		ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
			Code:   http.StatusBadRequest,
			Status: "Bad Request",
			Error:  err.Error(),
		})
		return
	}

	var id int
	if _, err := fmt.Sscanf(ctx.Param("id"), "%d", &id); err != nil {
		ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
			Code:   http.StatusBadRequest,
			Status: "Bad Request",
			Error:  "invalid id",
		})
		return
	}

	response, err := controller.Service.Update(ctx, id, &request)
	if err != nil {
		statusCode, statusText := logbookErrorStatus(err)
		ctx.JSON(statusCode, web.ErrorResponse{
			Code:   statusCode,
			Status: statusText,
			Error:  err.Error(),
		})
		return
	}

	ctx.JSON(response.Code, response)
}

func logbookErrorStatus(err error) (int, string) {
	if errors.Is(err, services.ErrInvalidLogbookPhoto) {
		return http.StatusBadRequest, "Bad Request"
	}

	return http.StatusInternalServerError, "Internal Server Error"
}

func (controller *LogbookController) GetQRCode(ctx *gin.Context) {
	var id int
	if _, err := fmt.Sscanf(ctx.Param("id"), "%d", &id); err != nil {
		ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
			Code:   http.StatusBadRequest,
			Status: "Bad Request",
			Error:  "invalid id",
		})
		return
	}

	response, err := controller.Service.GetQRCode(ctx, id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, web.ErrorResponse{
			Code:   http.StatusInternalServerError,
			Status: "Internal Server Error",
			Error:  err.Error(),
		})
		return
	}

	ctx.JSON(response.Code, response)
}

func (controller *LogbookController) CheckoutByToken(ctx *gin.Context) {
	token := ctx.Query("token")
	if token == "" {
		ctx.Data(http.StatusBadRequest, "text/html; charset=utf-8", []byte(`
			<html><body style="font-family:sans-serif;padding:24px;">
				<h2>QR tidak valid</h2>
				<p>Token checkout tidak ditemukan.</p>
			</body></html>
		`))
		return
	}

	message, err := controller.Service.CheckoutByToken(ctx, token)
	statusCode := http.StatusOK
	title := "Checkout berhasil"
	if err != nil {
		statusCode = http.StatusBadRequest
		title = "Checkout gagal"
	}

	html := fmt.Sprintf(`
		<html>
			<body style="font-family:sans-serif;padding:24px;background:#f6f7f8;color:#111827;">
				<div style="max-width:520px;margin:40px auto;background:#fff;padding:24px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
					<h2 style="margin:0 0 12px;">%s</h2>
					<p style="margin:0;line-height:1.6;">%s</p>
				</div>
			</body>
		</html>
	`, title, message)

	ctx.Data(statusCode, "text/html; charset=utf-8", []byte(html))
}

func (controller *LogbookController) Delete(ctx *gin.Context) {
	var id int
	if _, err := fmt.Sscanf(ctx.Param("id"), "%d", &id); err != nil {
		ctx.JSON(http.StatusBadRequest, web.ErrorResponse{
			Code:   http.StatusBadRequest,
			Status: "Bad Request",
			Error:  "invalid id",
		})
		return
	}

	response, err := controller.Service.Delete(ctx, id)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, web.ErrorResponse{
			Code:   http.StatusInternalServerError,
			Status: "Internal Server Error",
			Error:  err.Error(),
		})
		return
	}

	ctx.JSON(response.Code, response)
}
