import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:hive_ce/hive.dart';

part 'app_state_snapshot.freezed.dart';
part 'app_state_snapshot.g.dart';

/// Represents a complete snapshot of all cubit states at a specific point in time
@freezed
@HiveType(typeId: 103)
class AppStateSnapshot with _$AppStateSnapshot {
  const factory AppStateSnapshot({
    /// Unique identifier for this snapshot
    required String id,
    
    /// When this snapshot was captured
    required DateTime timestamp,
    
    /// Description of why this snapshot was taken (e.g., "Error occurred", "User requested")
    required String description,
    
    /// Map of cubit type to its serialized state
    required Map<String, Map<String, dynamic>> cubitStates,
    
    /// Device information for debugging
    required DeviceInfo deviceInfo,
    
    /// App version when snapshot was taken
    required String appVersion,
    
    /// Optional error information if this snapshot was taken due to an error
    ErrorInfo? errorInfo,
    
    /// Tags for categorization
    @Default([]) List<String> tags,
    
    /// User identifier (if applicable)
    String? userId,
    
    /// Additional metadata
    @Default({}) Map<String, dynamic> metadata,
  }) = _AppStateSnapshot;

  factory AppStateSnapshot.fromJson(Map<String, dynamic> json) =>
      _$AppStateSnapshotFromJson(json);
}

@freezed
@HiveType(typeId: 104)
class DeviceInfo with _$DeviceInfo {
  const factory DeviceInfo({
    required String platform, // iOS, Android, Web
    required String osVersion,
    required String deviceModel,
    required String deviceId,
    @Default({}) Map<String, dynamic> additionalInfo,
  }) = _DeviceInfo;

  factory DeviceInfo.fromJson(Map<String, dynamic> json) =>
      _$DeviceInfoFromJson(json);
}

@freezed
@HiveType(typeId: 105)
class ErrorInfo with _$ErrorInfo {
  const factory ErrorInfo({
    required String message,
    required String stackTrace,
    required String errorType,
    @Default({}) Map<String, dynamic> context,
  }) = _ErrorInfo;

  factory ErrorInfo.fromJson(Map<String, dynamic> json) =>
      _$ErrorInfoFromJson(json);
}