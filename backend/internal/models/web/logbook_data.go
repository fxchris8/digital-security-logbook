package web

type LogbookListRequest struct {
	AnchorID int    `form:"anchor_id" binding:"min=0"`
	Page     string `form:"page" binding:"required,oneof=next prev"`
	PageSize int    `form:"page_size" binding:"required,gte=1,lte=200"`
	Query    string `form:"query"`
}
