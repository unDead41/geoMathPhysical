import 'dart:math';

/// Game parity must use explicit draws, rather than matching JavaScript seeds.
abstract interface class RandomSource {
  double nextDouble();
  int nextInt(int maximum);
}

final class DefaultRandomSource implements RandomSource {
  DefaultRandomSource([Random? random]) : _random = random ?? Random();

  final Random _random;

  @override
  double nextDouble() => _random.nextDouble();

  @override
  int nextInt(int maximum) => _random.nextInt(maximum);
}

final class SecureRandomSource implements RandomSource {
  SecureRandomSource() : _random = Random.secure();

  final Random _random;

  @override
  double nextDouble() => _random.nextDouble();

  @override
  int nextInt(int maximum) => _random.nextInt(maximum);
}

String randomIdentifier(RandomSource random, {int bytes = 16}) => List.generate(
  bytes,
  (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
).join();
