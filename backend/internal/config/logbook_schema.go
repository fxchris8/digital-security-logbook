package config

import (
	"strings"

	"backend/internal/models/domain"

	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

func ensureLogbookSchema(db *gorm.DB, log *logrus.Logger) {
	if err := db.AutoMigrate(&domain.Logbook{}); err != nil {
		log.Fatalf("failed to migrate logbook table: %v", err)
	}

	var dataType string
	if err := db.Raw(`
		SELECT DATA_TYPE
		FROM information_schema.columns
		WHERE table_schema = DATABASE()
			AND table_name = 'data_logbook'
			AND column_name = 'foto_tanda_pengenal'
		LIMIT 1
	`).Scan(&dataType).Error; err != nil {
		log.Fatalf("failed to inspect logbook photo column: %v", err)
	}

	switch strings.ToLower(dataType) {
	case "mediumtext", "longtext":
		return
	}

	if dataType == "" {
		log.Fatal("failed to find data_logbook.foto_tanda_pengenal after logbook migration")
	}

	log.Infof("Expanding data_logbook.foto_tanda_pengenal from %s to MEDIUMTEXT", dataType)
	if err := db.Exec(`
		ALTER TABLE data_logbook
		MODIFY COLUMN foto_tanda_pengenal MEDIUMTEXT NULL
	`).Error; err != nil {
		log.Fatalf("failed to expand logbook photo column: %v", err)
	}
}
