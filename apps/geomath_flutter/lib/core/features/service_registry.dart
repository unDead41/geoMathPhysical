/// A typed, stable key for a composition-owned service.
///
/// Names are globally unique, even when two services have different types.
final class ServiceKey<T extends Object> {
  const ServiceKey(this.name);

  final String name;
  Type get type => T;

  @override
  String toString() => '$name<$T>';
}

/// Erased registration surface; features construct [ServiceFactory] instead.
abstract class ServiceFactoryBase {
  String get name;
  Type get type;
  Object create(ServiceRegistry services);
  void disposeInstance(Object instance);
}

final class ServiceFactory<T extends Object> extends ServiceFactoryBase {
  ServiceFactory({
    required this.key,
    required this.createService,
    this.dispose,
  });

  final ServiceKey<T> key;
  final T Function(ServiceRegistry services) createService;
  final void Function(T service)? dispose;

  @override
  String get name => key.name;

  @override
  Type get type => T;

  @override
  T create(ServiceRegistry services) => createService(services);

  @override
  void disposeInstance(Object instance) => dispose?.call(instance as T);
}

/// Lazy singletons with one owner and deterministic reverse-order disposal.
///
/// All registrations are checked before a factory runs. A factory may resolve
/// earlier or later registrations; dependency cycles produce a [StateError].
final class ServiceRegistry {
  ServiceRegistry(Iterable<ServiceFactoryBase> factories) {
    for (final factory in factories) {
      if (factory.name.trim().isEmpty) {
        throw ArgumentError.value(factory.name, 'service name', 'Empty name');
      }
      if (_factories.containsKey(factory.name)) {
        throw ArgumentError('Duplicate service: ${factory.name}');
      }
      _factories[factory.name] = factory;
    }
  }

  final Map<String, ServiceFactoryBase> _factories = {};
  final Map<String, Object> _instances = {};
  final List<String> _creating = [];
  bool _disposed = false;

  bool get isDisposed => _disposed;
  Iterable<String> get names => List.unmodifiable(_factories.keys);

  bool contains<T extends Object>(ServiceKey<T> key) =>
      !_disposed && _factories[key.name]?.type == key.type;

  T get<T extends Object>(ServiceKey<T> key) {
    if (_disposed) throw StateError('Services have been disposed');
    final factory = _factories[key.name];
    if (factory == null) {
      throw StateError('Service not registered: ${key.name}');
    }
    if (factory.type != key.type) {
      throw StateError('Service type mismatch: ${key.name}');
    }
    if (_instances[key.name] case final instance?) return instance as T;
    if (_creating.contains(key.name)) {
      throw StateError('Service dependency cycle: ${[..._creating, key.name]}');
    }
    _creating.add(key.name);
    try {
      final instance = factory.create(this);
      _instances[key.name] = instance;
      return instance as T;
    } finally {
      _creating.removeLast();
    }
  }

  void dispose() {
    if (_disposed) return;
    _disposed = true;
    Object? firstError;
    StackTrace? firstStack;
    for (final name in _instances.keys.toList().reversed) {
      try {
        _factories[name]!.disposeInstance(_instances[name]!);
      } catch (error, stack) {
        firstError ??= error;
        firstStack ??= stack;
      }
    }
    _instances.clear();
    if (firstError != null) Error.throwWithStackTrace(firstError, firstStack!);
  }
}
