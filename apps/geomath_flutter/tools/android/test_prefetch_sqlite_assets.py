import hashlib
import http.client
import io
import pathlib
import tempfile
import unittest

from prefetch_sqlite_assets import fetch_verified


class Response(io.BytesIO):
    status = 200


class VerifiedDownloadTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.target = pathlib.Path(self.directory.name) / 'download/libsqlite3.so'
        self.data = b'\x7fELFtest release bytes'
        self.expected = hashlib.sha256(self.data).hexdigest()
        self.url = 'https://github.com/simolus3/sqlite3.dart/releases/download/test/libsqlite3.so'

    def test_corrupt_body_is_retried_then_only_verified_bytes_are_published(self):
        bodies = iter([b'upstream failure', self.data])
        def opener(request, timeout):
            return Response(next(bodies))
        result = fetch_verified(self.url, self.expected, self.target,
                                opener=opener, pause=lambda _: None)
        self.assertEqual(self.target.read_bytes(), self.data)
        self.assertEqual(result['attempts'], 2)
        self.assertEqual(len(result['earlier_failures']), 1)

    def test_interrupted_response_is_retried_before_publication(self):
        calls = []
        class Interrupted(Response):
            def read(self, size=-1):
                raise http.client.IncompleteRead(b'partial', 100)
        def opener(request, timeout):
            calls.append(request.full_url)
            return Interrupted() if len(calls) == 1 else Response(self.data)
        result = fetch_verified(self.url, self.expected, self.target,
                                opener=opener, pause=lambda _: None)
        self.assertEqual(result['attempts'], 2)
        self.assertEqual(self.target.read_bytes(), self.data)

    def test_persistent_corruption_fails_after_three_without_publishing(self):
        calls = []
        def opener(request, timeout):
            calls.append(request.full_url)
            return Response(b'wrong content')
        with self.assertRaisesRegex(RuntimeError, 'failed 3 verified attempts'):
            fetch_verified(self.url, self.expected, self.target,
                           opener=opener, pause=lambda _: None)
        self.assertEqual(len(calls), 3)
        self.assertFalse(self.target.exists())

    def test_valid_cached_file_is_rehashed_and_reused_without_network(self):
        self.target.parent.mkdir()
        self.target.write_bytes(self.data)
        def opener(request, timeout):
            self.fail('Verified cache must not require network')
        result = fetch_verified(self.url, self.expected, self.target, opener=opener)
        self.assertTrue(result['cached'])
        self.assertEqual(result['attempts'], 0)

    def test_corrupt_cached_file_cannot_be_accepted_when_http_fails(self):
        self.target.parent.mkdir()
        self.target.write_bytes(b'corrupted cached file')
        def opener(request, timeout):
            response = Response(self.data)
            response.status = 503
            return response
        with self.assertRaisesRegex(RuntimeError, 'HTTP 503'):
            fetch_verified(self.url, self.expected, self.target,
                           opener=opener, pause=lambda _: None)
        self.assertEqual(self.target.read_bytes(), b'corrupted cached file')


if __name__ == '__main__':
    unittest.main()
