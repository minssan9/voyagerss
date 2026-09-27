-- V2 removes leftover Investand tables once.
-- Does NOT drop system_config (shared with workschd and aipr).

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `notification_logs`;
DROP TABLE IF EXISTS `notification_subscriptions`;
DROP TABLE IF EXISTS `notification_templates`;
DROP TABLE IF EXISTS `notification_channels`;
DROP TABLE IF EXISTS `report_executions`;
DROP TABLE IF EXISTS `report_schedules`;
DROP TABLE IF EXISTS `report_definitions`;
DROP TABLE IF EXISTS `data_export_requests`;
DROP TABLE IF EXISTS `system_insights`;
DROP TABLE IF EXISTS `admin_sessions`;
DROP TABLE IF EXISTS `admin_refresh_tokens`;
DROP TABLE IF EXISTS `admin_login_attempts`;
DROP TABLE IF EXISTS `admin_audit_logs`;
DROP TABLE IF EXISTS `websocket_connections`;
DROP TABLE IF EXISTS `admin_users`;
DROP TABLE IF EXISTS `security_config`;
DROP TABLE IF EXISTS `rate_limit_records`;
DROP TABLE IF EXISTS `dart_stock_holdings`;
DROP TABLE IF EXISTS `dart_financials`;
DROP TABLE IF EXISTS `dart_disclosures`;
DROP TABLE IF EXISTS `dart_companies`;
DROP TABLE IF EXISTS `dart_batch_logs`;
DROP TABLE IF EXISTS `dart_collection_stats`;
DROP TABLE IF EXISTS `dart_alerts`;
DROP TABLE IF EXISTS `sector_comparison`;
DROP TABLE IF EXISTS `sector_performance`;
DROP TABLE IF EXISTS `asset_correlation`;
DROP TABLE IF EXISTS `normalized_asset_data`;
DROP TABLE IF EXISTS `global_asset_performance`;
DROP TABLE IF EXISTS `sentiment_fear_greed_index`;
DROP TABLE IF EXISTS `market_kospi_data`;
DROP TABLE IF EXISTS `market_kosdaq_data`;
DROP TABLE IF EXISTS `trading_investor_trading`;
DROP TABLE IF EXISTS `trading_option_data`;
DROP TABLE IF EXISTS `macro_interest_rate_data`;
DROP TABLE IF EXISTS `macro_exchange_rate_data`;
DROP TABLE IF EXISTS `macro_economic_indicator_data`;
DROP TABLE IF EXISTS `market_vkospi_data`;
DROP TABLE IF EXISTS `market_bond_yield_curve_data`;
DROP TABLE IF EXISTS `system_data_collection_log`;
DROP TABLE IF EXISTS `external_upbit_index_data`;
DROP TABLE IF EXISTS `external_cnn_fg_index_data`;
DROP TABLE IF EXISTS `external_korea_fg_index_data`;

SET FOREIGN_KEY_CHECKS = 1;
