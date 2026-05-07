package web

type GenerateLogbookQRRequest struct {
	Tanggal              string `json:"tanggal"`
	Nama                 string `json:"nama" binding:"required"`
	NomorTelepon         string `json:"nomorTelepon" binding:"required"`
	Alamat               string `json:"alamat" binding:"required"`
	NomorPolisiKendaraan string `json:"nomorPolisiKendaraan"`
	FotoTandaPengenal    string `json:"fotoTandaPengenal" binding:"required"`
	Perusahaan           string `json:"perusahaan" binding:"required"`
	JanjiBertemuDengan   string `json:"janjiBertemuDengan" binding:"required"`
	Keperluan            string `json:"keperluan" binding:"required"`
}

type UpdateLogbookRequest struct {
	Tanggal              string `json:"tanggal"`
	Nama                 string `json:"nama" binding:"required"`
	NomorTelepon         string `json:"nomorTelepon" binding:"required"`
	Alamat               string `json:"alamat" binding:"required"`
	NomorPolisiKendaraan string `json:"nomorPolisiKendaraan"`
	FotoTandaPengenal    string `json:"fotoTandaPengenal" binding:"required"`
	Perusahaan           string `json:"perusahaan" binding:"required"`
	JanjiBertemuDengan   string `json:"janjiBertemuDengan" binding:"required"`
	Keperluan            string `json:"keperluan" binding:"required"`
}

type LogbookQRCodeResponse struct {
	LogbookID   int    `json:"logbookId"`
	CheckoutURL string `json:"checkoutUrl"`
	QRImageURL  string `json:"qrImageUrl"`
}

type LogbookPhotoUploadResponse struct {
	Path string `json:"path"`
	URL  string `json:"url"`
}
