import '../../core/features/service_registry.dart';
import 'data/auth_repository.dart';
import 'data/cloud_gateway.dart';

abstract final class AuthServices {
  static const gateway = ServiceKey<CloudGateway>('auth.gateway');
  static const repository = ServiceKey<AuthRepository>('auth.repository');
}
