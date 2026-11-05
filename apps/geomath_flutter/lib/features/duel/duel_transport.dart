import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../../app/public_backend_configuration.dart';

final class DuelWireResponse {
  const DuelWireResponse({
    required this.status,
    required this.body,
    this.headers = const {},
  });
  final int status;
  final String body;
  final Map<String, String> headers;
  String? header(String key) => headers[key.toLowerCase()];
}

abstract interface class DuelTransport {
  Future<DuelWireResponse> post(Map<String, Object?> command);
  void cancelPending();
  void close();
}

/// Direct guest-capability HTTPS adapter. Never borrows a Supabase user JWT.
final class IoDuelTransport implements DuelTransport {
  IoDuelTransport(
    PublicBackendConnection connection, {
    HttpClient? client,
    this.timeout = const Duration(seconds: 25),
  }) : endpoint = connection.url.resolve('/functions/v1/geodecoder-duel'),
       _publicKey = connection.publishableKey,
       _client = client ?? HttpClient() {
    if (endpoint.scheme != 'https' || endpoint.userInfo.isNotEmpty) {
      throw ArgumentError('Duel requires a configured HTTPS endpoint.');
    }
    _client.connectionTimeout = timeout;
  }

  final Uri endpoint;
  final String _publicKey;
  final HttpClient _client;
  final Duration timeout;
  final Set<HttpClientRequest> _pending = {};
  bool _closed = false;
  int _generation = 0;

  @override
  Future<DuelWireResponse> post(Map<String, Object?> command) async {
    if (_closed) throw const HttpException('Duel transport closed');
    final encoded = utf8.encode(jsonEncode(command));
    if (encoded.length > 4096) throw const FormatException('Duel command size');
    HttpClientRequest? request;
    final generation = _generation;
    var abandoned = false;
    try {
      return await (() async {
        request = await _client.postUrl(endpoint);
        if (_closed || abandoned || generation != _generation) {
          request!.abort();
          throw const HttpException('Duel transport closed');
        }
        _pending.add(request!);
        request!.followRedirects = false;
        request!.headers.contentType = ContentType.json;
        request!.headers.set('apikey', _publicKey);
        request!.headers.set(HttpHeaders.cacheControlHeader, 'no-store');
        request!.contentLength = encoded.length;
        request!.add(encoded);
        final response = await request!.close();
        final bytes = <int>[];
        await for (final chunk in response) {
          if (bytes.length + chunk.length > 262144) {
            request!.abort();
            throw const FormatException('Duel response size');
          }
          bytes.addAll(chunk);
        }
        final headers = <String, String>{};
        response.headers.forEach(
          (name, values) => headers[name.toLowerCase()] = values.join(','),
        );
        return DuelWireResponse(
          status: response.statusCode,
          body: utf8.decode(bytes),
          headers: Map.unmodifiable(headers),
        );
      })().timeout(timeout);
    } on TimeoutException {
      abandoned = true;
      request?.abort();
      rethrow;
    } finally {
      _pending.remove(request);
    }
  }

  @override
  void cancelPending() {
    _generation++;
    for (final request in _pending.toList()) {
      request.abort();
    }
    _pending.clear();
  }

  @override
  void close() {
    if (_closed) return;
    _closed = true;
    cancelPending();
    _client.close(force: true);
  }
}
