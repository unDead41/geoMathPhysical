import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Immutable request snapshots never substitute an SDK user.
final class AuthRequest {
  AuthRequest({
    required this.uri,
    required this.method,
    required Map<String, String> headers,
    this.body,
  }) : headers = Map.unmodifiable(headers);
  final Uri uri;
  final String method;
  final Map<String, String> headers;
  final Map<String, Object?>? body;
}

final class AuthResponse {
  const AuthResponse(this.statusCode, this.data, {this.retryAfter});
  final int statusCode;
  final Map<String, Object?> data;
  final String? retryAfter;
}

abstract interface class AuthTransport {
  Future<AuthResponse> send(AuthRequest request);
  void close();
}

/// One bounded attempt. Account mutations are never automatically retried.
final class NativeAuthTransport implements AuthTransport {
  NativeAuthTransport({
    this.deadline = const Duration(seconds: 20),
    HttpClient? client,
  }) : _client = client ?? HttpClient() {
    if (deadline <= Duration.zero) {
      throw ArgumentError.value(deadline, 'deadline');
    }
    _client.connectionTimeout = deadline;
  }
  final Duration deadline;
  final HttpClient _client;
  @override
  Future<AuthResponse> send(AuthRequest request) async {
    HttpClientRequest? pending;
    var expired = false;
    Future<AuthResponse> attempt() async {
      final opened = await _client.openUrl(request.method, request.uri);
      pending = opened;
      // openUrl can finish after the deadline; never send that late request.
      if (expired) {
        opened.abort();
        throw TimeoutException('The account request deadline expired.');
      }
      opened.followRedirects = false;
      request.headers.forEach(opened.headers.set);
      if (request.body != null) opened.write(jsonEncode(request.body));
      final response = await opened.close();
      if (response.statusCode < 200 || response.statusCode >= 300) {
        // Gateways can return HTML/text errors. Their status and retry budget
        // remain authoritative; untrusted error bodies are never UI data.
        final rejected = AuthResponse(
          response.statusCode,
          const {},
          retryAfter: response.headers.value(HttpHeaders.retryAfterHeader),
        );
        await response.listen(null).cancel();
        return rejected;
      }
      final bytes = <int>[];
      await for (final chunk in response) {
        if (bytes.length + chunk.length > 1048576) {
          opened.abort();
          throw const FormatException('Response exceeds the account limit.');
        }
        bytes.addAll(chunk);
      }
      final Object? decoded = bytes.isEmpty
          ? <String, Object?>{}
          : jsonDecode(utf8.decode(bytes));
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Account response is not an object.');
      }
      return AuthResponse(
        response.statusCode,
        decoded,
        retryAfter: response.headers.value(HttpHeaders.retryAfterHeader),
      );
    }

    // This covers connection, headers and the entire body, even if bytes keep
    // arriving. A stream inactivity timeout alone would permit endless trickles.
    return attempt().timeout(
      deadline,
      onTimeout: () {
        expired = true;
        pending?.abort(
          TimeoutException('The account request deadline expired.'),
        );
        throw TimeoutException('The account request deadline expired.');
      },
    );
  }

  @override
  void close() => _client.close(force: true);
}
