# 撰寫 Makefile

# 顯示所有指令
help:
	@echo "可用的指令:"
	@echo "make deploy-stg - 部署到 Staging 環境"
	@echo "make deploy-prd - 部署到 Prodcution 環境"

# 部署到 Staging 環境
deploy-stg:
	npm run build:staging
	aws s3 sync dist/spa s3://preview-amulet.web-interactive.org --delete

deploy-prd:
	npm run build:production
	aws s3 sync dist/spa s3://amulet.web-interactive.org --delete
