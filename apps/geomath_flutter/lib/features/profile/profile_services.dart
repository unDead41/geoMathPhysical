import '../../core/features/service_registry.dart';
import 'data/profile_repository.dart';
import 'data/profile_drafts.dart';

abstract final class ProfileServices {
  static const drafts = ServiceKey<ProfileDrafts>('profile.drafts');
  static const repository = ServiceKey<ProfileRepository>('profile.repository');
}
