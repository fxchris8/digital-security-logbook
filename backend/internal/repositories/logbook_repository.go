package repositories

import (
	"strings"

	"backend/internal/models/domain"
	"backend/internal/models/web"

	"gorm.io/gorm"
)

type LogbookRepository struct{}

func NewLogbookRepository() *LogbookRepository {
	return &LogbookRepository{}
}

func (r *LogbookRepository) SelectAll(db *gorm.DB, filter *web.LogbookListRequest, logbooks *[]domain.Logbook) error {
	var queryBuilder strings.Builder
	var args []interface{}

	queryBuilder.WriteString(`
		SELECT
			id,
			COALESCE(DATE_FORMAT(tanggal, '%Y-%m-%d'), '') AS tanggal,
			COALESCE(TIME_FORMAT(waktu_masuk, '%H:%i:%s'), '') AS waktu_masuk,
			COALESCE(NULLIF(TIME_FORMAT(waktu_keluar, '%H:%i:%s'), '00:00:00'), '') AS waktu_keluar,
			COALESCE(nama, '') AS nama,
			COALESCE(nomor_telepon, '') AS nomor_telepon,
			COALESCE(alamat, '') AS alamat,
			COALESCE(nomor_polisi_kendaraan, '') AS nomor_polisi_kendaraan,
			COALESCE(foto_tanda_pengenal, '') AS foto_tanda_pengenal,
			COALESCE(perusahaan, '') AS perusahaan,
			COALESCE(janji_bertemu_dengan, '') AS janji_bertemu_dengan,
			COALESCE(keperluan, '') AS keperluan
		FROM data_logbook
		WHERE
	`)

	if filter.Page == "next" && filter.AnchorID > 0 {
		queryBuilder.WriteString("id < ?")
	} else if filter.Page == "next" {
		queryBuilder.WriteString("id > ?")
	} else {
		queryBuilder.WriteString("id > ?")
	}
	args = append(args, filter.AnchorID)

	if filter.Query != "" {
		q := "%" + strings.ToLower(filter.Query) + "%"
		queryBuilder.WriteString(`
			AND (
				LOWER(nama) LIKE ?
				OR LOWER(nomor_telepon) LIKE ?
				OR LOWER(alamat) LIKE ?
				OR LOWER(nomor_polisi_kendaraan) LIKE ?
				OR LOWER(perusahaan) LIKE ?
				OR LOWER(janji_bertemu_dengan) LIKE ?
				OR LOWER(keperluan) LIKE ?
			)
		`)
		args = append(args, q, q, q, q, q, q, q)
	}

	if filter.Page == "next" {
		queryBuilder.WriteString(" ORDER BY id DESC LIMIT ?")
	} else {
		queryBuilder.WriteString(" ORDER BY id ASC LIMIT ?")
	}
	args = append(args, filter.PageSize+1)

	return db.Raw(queryBuilder.String(), args...).Scan(logbooks).Error
}

func (r *LogbookRepository) FindByID(db *gorm.DB, id int, logbook *domain.Logbook) error {
	return db.Where("id = ?", id).First(logbook).Error
}

func (r *LogbookRepository) Create(db *gorm.DB, logbook *domain.Logbook) error {
	return db.Create(logbook).Error
}

func (r *LogbookRepository) Update(db *gorm.DB, logbook *domain.Logbook) error {
	return db.Save(logbook).Error
}

func (r *LogbookRepository) Delete(db *gorm.DB, logbook *domain.Logbook) error {
	return db.Delete(logbook).Error
}
