package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	neturl "net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"backend/internal/helpers"
	"backend/internal/models/domain"
	"backend/internal/models/web"
	"backend/internal/repositories"

	"github.com/golang-jwt/jwt/v5"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

var ErrInvalidLogbookPhoto = errors.New("invalid logbook photo")

const defaultMaxUploadSize = 5 * 1024 * 1024

type LogbookService struct {
	DB                *gorm.DB
	Log               *logrus.Logger
	LogbookRepository *repositories.LogbookRepository
	JWTSecret         string
	BackendPublicURL  string
	Location          *time.Location
	UploadDir         string
	MaxUploadSize     int64
}

func NewLogbookService(
	db *gorm.DB,
	log *logrus.Logger,
	logbookRepository *repositories.LogbookRepository,
	jwtSecret string,
	backendPublicURL string,
	appTimezone string,
	uploadDir string,
	maxUploadSize int64,
) *LogbookService {
	location, err := time.LoadLocation(strings.TrimSpace(appTimezone))
	if err != nil || location == nil {
		location = time.FixedZone("WIB", 7*60*60)
	}
	uploadDir = strings.TrimSpace(uploadDir)
	if uploadDir == "" {
		uploadDir = "storage/uploads"
	}
	if maxUploadSize <= 0 {
		maxUploadSize = defaultMaxUploadSize
	}

	return &LogbookService{
		DB:                db,
		Log:               log,
		LogbookRepository: logbookRepository,
		JWTSecret:         jwtSecret,
		BackendPublicURL:  backendPublicURL,
		Location:          location,
		UploadDir:         uploadDir,
		MaxUploadSize:     maxUploadSize,
	}
}

func (service *LogbookService) now() time.Time {
	if service.Location == nil {
		return time.Now()
	}

	return time.Now().In(service.Location)
}

func normalizeLogbookTime(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || trimmed == "00:00:00" {
		return ""
	}

	return trimmed
}

func (service *LogbookService) UploadPhoto(ctx context.Context, fileHeader *multipart.FileHeader) (*web.SuccessResponse, error) {
	_ = ctx
	if fileHeader == nil {
		return nil, fmt.Errorf("%w: file foto wajib diupload", ErrInvalidLogbookPhoto)
	}
	if fileHeader.Size <= 0 {
		return nil, fmt.Errorf("%w: file foto kosong", ErrInvalidLogbookPhoto)
	}
	if fileHeader.Size > service.MaxUploadSize {
		maxMB := service.MaxUploadSize / (1024 * 1024)
		return nil, fmt.Errorf("%w: ukuran foto maksimal %d MB", ErrInvalidLogbookPhoto, maxMB)
	}

	contentType, err := detectUploadedFileType(fileHeader)
	if err != nil {
		return nil, err
	}

	extensionsByType := map[string]string{
		"image/jpeg": ".jpg",
		"image/png":  ".png",
		"image/webp": ".webp",
	}
	extension, ok := extensionsByType[contentType]
	if !ok {
		return nil, fmt.Errorf("%w: file harus berupa JPG, PNG, atau WEBP", ErrInvalidLogbookPhoto)
	}

	randomSuffix, err := randomHex(8)
	if err != nil {
		return nil, err
	}

	fileName := fmt.Sprintf("%s-%s%s", service.now().Format("20060102-150405"), randomSuffix, extension)
	targetDir := filepath.Join(service.UploadDir, "logbook-identities")
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return nil, err
	}

	targetPath := filepath.Join(targetDir, fileName)
	if err := saveUploadedFile(fileHeader, targetPath); err != nil {
		return nil, err
	}

	publicPath := "/uploads/logbook-identities/" + fileName
	return &web.SuccessResponse{
		Status: "Created",
		Code:   http.StatusCreated,
		Data: &web.LogbookPhotoUploadResponse{
			Path: publicPath,
			URL:  service.buildPublicURL(publicPath),
		},
	}, nil
}

func detectUploadedFileType(fileHeader *multipart.FileHeader) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	buffer := make([]byte, 512)
	n, err := file.Read(buffer)
	if err != nil && !errors.Is(err, io.EOF) {
		return "", err
	}

	return http.DetectContentType(buffer[:n]), nil
}

func saveUploadedFile(fileHeader *multipart.FileHeader, targetPath string) error {
	source, err := fileHeader.Open()
	if err != nil {
		return err
	}
	defer source.Close()

	target, err := os.Create(targetPath)
	if err != nil {
		return err
	}
	defer target.Close()

	_, err = io.Copy(target, source)
	return err
}

func randomHex(byteCount int) (string, error) {
	buffer := make([]byte, byteCount)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}

	return hex.EncodeToString(buffer), nil
}

func normalizeLogbookPhotoReference(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", fmt.Errorf("%w: foto tanda pengenal wajib diupload", ErrInvalidLogbookPhoto)
	}
	if strings.HasPrefix(trimmed, "data:") {
		return "", fmt.Errorf("%w: foto harus diupload ke storage terlebih dahulu", ErrInvalidLogbookPhoto)
	}
	if strings.HasPrefix(trimmed, "/uploads/") ||
		strings.HasPrefix(trimmed, "http://") ||
		strings.HasPrefix(trimmed, "https://") {
		return trimmed, nil
	}

	return "", fmt.Errorf("%w: path foto tidak valid", ErrInvalidLogbookPhoto)
}

func (service *LogbookService) FindAll(ctx context.Context, request *web.LogbookListRequest) (*web.SuccessResponse, error) {
	tx := service.DB.WithContext(ctx).Begin()
	defer tx.Rollback()

	var logbooks []domain.Logbook
	if err := service.LogbookRepository.SelectAll(tx, request, &logbooks); err != nil {
		return nil, err
	}

	if len(logbooks) == 0 {
		return &web.SuccessResponse{
			Status: "Ok",
			Code:   http.StatusOK,
			Data: map[string]interface{}{
				"results":    []domain.Logbook{},
				"first_id":   nil,
				"last_id":    nil,
				"page_size":  request.PageSize,
				"has_more":   false,
				"first_page": true,
			},
		}, nil
	}

	hasMore := false
	isFirstPage := false

	if request.Page == "prev" {
		if len(logbooks) > request.PageSize {
			logbooks = logbooks[:request.PageSize]
		} else {
			isFirstPage = true
		}

		helpers.Reverse(&logbooks)
		hasMore = true
	} else {
		if len(logbooks) > request.PageSize {
			hasMore = true
			logbooks = logbooks[:request.PageSize]
		}

		isFirstPage = request.AnchorID == 0
	}

	firstID := logbooks[0].ID
	lastID := logbooks[len(logbooks)-1].ID

	return &web.SuccessResponse{
		Status: "Ok",
		Code:   http.StatusOK,
		Data: map[string]interface{}{
			"results":    logbooks,
			"first_id":   firstID,
			"last_id":    lastID,
			"page_size":  request.PageSize,
			"has_more":   hasMore,
			"first_page": isFirstPage,
		},
	}, nil
}

func (service *LogbookService) GenerateQRCode(ctx context.Context, request *web.GenerateLogbookQRRequest) (*web.SuccessResponse, error) {
	tx := service.DB.WithContext(ctx).Begin()
	defer tx.Rollback()

	now := service.now()
	tanggal := strings.TrimSpace(request.Tanggal)
	if tanggal == "" {
		tanggal = now.Format("2006-01-02")
	}
	photoReference, err := normalizeLogbookPhotoReference(request.FotoTandaPengenal)
	if err != nil {
		return nil, err
	}

	logbook := domain.Logbook{
		Tanggal:              tanggal,
		WaktuMasuk:           now.Format("15:04:05"),
		WaktuKeluar:          "",
		Nama:                 request.Nama,
		Alamat:               request.Alamat,
		NomorPolisiKendaraan: strings.TrimSpace(request.NomorPolisiKendaraan),
		FotoTandaPengenal:    photoReference,
		Perusahaan:           request.Perusahaan,
		JanjiBertemuDengan:   request.JanjiBertemuDengan,
		Keperluan:            request.Keperluan,
	}

	if err := service.LogbookRepository.Create(tx, &logbook); err != nil {
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	qrData, err := service.buildQRCodeResponse(logbook.ID)
	if err != nil {
		return nil, err
	}

	return &web.SuccessResponse{
		Status: "Created",
		Code:   http.StatusCreated,
		Data: map[string]interface{}{
			"logbook": logbook,
			"qr":      qrData,
		},
	}, nil
}

func (service *LogbookService) Update(ctx context.Context, id int, request *web.UpdateLogbookRequest) (*web.SuccessResponse, error) {
	tx := service.DB.WithContext(ctx).Begin()
	defer tx.Rollback()

	var logbook domain.Logbook
	if err := service.LogbookRepository.FindByID(tx, id, &logbook); err != nil {
		return nil, err
	}

	oldPhotoPath := logbook.FotoTandaPengenal

	if strings.TrimSpace(request.Tanggal) != "" {
		logbook.Tanggal = strings.TrimSpace(request.Tanggal)
	}
	photoReference, err := normalizeLogbookPhotoReference(request.FotoTandaPengenal)
	if err != nil {
		return nil, err
	}
	logbook.Nama = request.Nama
	logbook.Alamat = request.Alamat
	logbook.NomorPolisiKendaraan = strings.TrimSpace(request.NomorPolisiKendaraan)
	logbook.FotoTandaPengenal = photoReference
	logbook.Perusahaan = request.Perusahaan
	logbook.JanjiBertemuDengan = request.JanjiBertemuDengan
	logbook.Keperluan = request.Keperluan

	if err := service.LogbookRepository.Update(tx, &logbook); err != nil {
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	if oldPhotoPath != logbook.FotoTandaPengenal {
		service.deleteStoredPhoto(oldPhotoPath)
	}

	return &web.SuccessResponse{
		Status: "OK",
		Code:   http.StatusOK,
		Data:   logbook,
	}, nil
}

func (service *LogbookService) Delete(ctx context.Context, id int) (*web.SuccessResponse, error) {
	tx := service.DB.WithContext(ctx).Begin()
	defer tx.Rollback()

	var logbook domain.Logbook
	if err := service.LogbookRepository.FindByID(tx, id, &logbook); err != nil {
		return nil, err
	}
	photoPath := logbook.FotoTandaPengenal

	if err := service.LogbookRepository.Delete(tx, &logbook); err != nil {
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}
	service.deleteStoredPhoto(photoPath)

	return &web.SuccessResponse{
		Status: "OK",
		Code:   http.StatusOK,
		Data:   fmt.Sprintf("Logbook with id %d deleted", id),
	}, nil
}

func (service *LogbookService) GetQRCode(ctx context.Context, id int) (*web.SuccessResponse, error) {
	tx := service.DB.WithContext(ctx).Begin()
	defer tx.Rollback()

	var logbook domain.Logbook
	if err := service.LogbookRepository.FindByID(tx, id, &logbook); err != nil {
		return nil, err
	}
	logbook.WaktuKeluar = normalizeLogbookTime(logbook.WaktuKeluar)

	qrData, err := service.buildQRCodeResponse(logbook.ID)
	if err != nil {
		return nil, err
	}

	return &web.SuccessResponse{
		Status: "OK",
		Code:   http.StatusOK,
		Data: map[string]interface{}{
			"logbook": logbook,
			"qr":      qrData,
		},
	}, nil
}

func (service *LogbookService) CheckoutByToken(ctx context.Context, token string) (string, error) {
	logbookID, err := service.parseCheckoutToken(token)
	if err != nil {
		return "QR tidak valid atau sudah kedaluwarsa.", err
	}

	tx := service.DB.WithContext(ctx).Begin()
	defer tx.Rollback()

	var logbook domain.Logbook
	if err := service.LogbookRepository.FindByID(tx, logbookID, &logbook); err != nil {
		return "Data logbook tidak ditemukan.", err
	}

	logbook.WaktuKeluar = normalizeLogbookTime(logbook.WaktuKeluar)
	if logbook.WaktuKeluar != "" {
		return fmt.Sprintf("QR sudah pernah digunakan. Waktu keluar tercatat pada %s.", logbook.WaktuKeluar), nil
	}

	logbook.WaktuKeluar = service.now().Format("15:04:05")
	if err := service.LogbookRepository.Update(tx, &logbook); err != nil {
		return "Gagal mencatat waktu keluar.", err
	}

	if err := tx.Commit().Error; err != nil {
		return "Gagal menyimpan waktu keluar.", err
	}

	return fmt.Sprintf("Waktu keluar untuk %s berhasil dicatat pada %s.", logbook.Nama, logbook.WaktuKeluar), nil
}

func (service *LogbookService) buildPublicURL(publicPath string) string {
	baseURL := strings.TrimRight(service.BackendPublicURL, "/")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	return baseURL + publicPath
}

func (service *LogbookService) deleteStoredPhoto(photoPath string) {
	filePath, ok := service.resolveStoredPhotoPath(photoPath)
	if !ok {
		return
	}

	if err := os.Remove(filePath); err != nil && !errors.Is(err, os.ErrNotExist) {
		service.Log.Warnf("failed to delete logbook photo %s: %v", filePath, err)
	}
}

func (service *LogbookService) resolveStoredPhotoPath(photoPath string) (string, bool) {
	trimmed := strings.TrimSpace(photoPath)
	if trimmed == "" || strings.HasPrefix(trimmed, "data:") {
		return "", false
	}
	if strings.HasPrefix(trimmed, "http://") || strings.HasPrefix(trimmed, "https://") {
		parsedURL, err := neturl.Parse(trimmed)
		if err != nil {
			return "", false
		}
		trimmed = parsedURL.Path
	}
	if !strings.HasPrefix(trimmed, "/uploads/") {
		return "", false
	}

	relativePath := strings.TrimPrefix(trimmed, "/uploads/")
	filePath := filepath.Join(service.UploadDir, filepath.FromSlash(relativePath))
	uploadRoot, err := filepath.Abs(service.UploadDir)
	if err != nil {
		return "", false
	}
	absolutePath, err := filepath.Abs(filePath)
	if err != nil {
		return "", false
	}
	if absolutePath == uploadRoot || !strings.HasPrefix(absolutePath, uploadRoot+string(os.PathSeparator)) {
		return "", false
	}

	return absolutePath, true
}

func (service *LogbookService) buildQRCodeResponse(logbookID int) (*web.LogbookQRCodeResponse, error) {
	token, err := service.generateCheckoutToken(logbookID)
	if err != nil {
		return nil, err
	}

	checkoutURL := fmt.Sprintf("%s/api/logbooks/checkout?token=%s", strings.TrimRight(service.buildPublicURL(""), "/"), neturl.QueryEscape(token))
	qrImageURL := fmt.Sprintf(
		"https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=%s",
		neturl.QueryEscape(checkoutURL),
	)

	return &web.LogbookQRCodeResponse{
		LogbookID:   logbookID,
		CheckoutURL: checkoutURL,
		QRImageURL:  qrImageURL,
	}, nil
}

func (service *LogbookService) generateCheckoutToken(logbookID int) (string, error) {
	claims := jwt.MapClaims{
		"logbook_id": logbookID,
		"type":       "logbook_checkout",
		"exp":        service.now().Add(7 * 24 * time.Hour).Unix(),
		"iat":        service.now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(service.JWTSecret))
}

func (service *LogbookService) parseCheckoutToken(tokenString string) (int, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(service.JWTSecret), nil
	})
	if err != nil {
		return 0, err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return 0, fmt.Errorf("invalid token")
	}

	if claims["type"] != "logbook_checkout" {
		return 0, fmt.Errorf("invalid token type")
	}

	logbookIDFloat, ok := claims["logbook_id"].(float64)
	if !ok {
		return 0, fmt.Errorf("invalid logbook id")
	}

	return int(logbookIDFloat), nil
}
