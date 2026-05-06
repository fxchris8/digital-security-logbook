package domain

import "time"

type Logbook struct {
	ID                   int        `json:"id" gorm:"column:id;primaryKey"`
	Tanggal              string     `json:"tanggal" gorm:"column:tanggal"`
	WaktuMasuk           string     `json:"waktuMasuk" gorm:"column:waktu_masuk"`
	WaktuKeluar          string     `json:"waktuKeluar" gorm:"column:waktu_keluar"`
	Nama                 string     `json:"nama" gorm:"column:nama"`
	Alamat               string     `json:"alamat" gorm:"column:alamat"`
	NomorPolisiKendaraan string     `json:"nomorPolisiKendaraan" gorm:"column:nomor_polisi_kendaraan;type:longtext"`
	FotoTandaPengenal    string     `json:"fotoTandaPengenal" gorm:"column:foto_tanda_pengenal;type:mediumtext"`
	Perusahaan           string     `json:"perusahaan" gorm:"column:perusahaan"`
	JanjiBertemuDengan   string     `json:"janjiBertemuDengan" gorm:"column:janji_bertemu_dengan"`
	Keperluan            string     `json:"keperluan" gorm:"column:keperluan"`
	CreatedAt            *time.Time `json:"createdAt,omitempty" gorm:"column:created_at"`
	UpdatedAt            *time.Time `json:"updatedAt,omitempty" gorm:"column:updated_at"`
}

func (Logbook) TableName() string {
	return "data_logbook"
}
