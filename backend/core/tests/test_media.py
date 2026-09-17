from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from accounts.services.auth import issue_tokens
from core.models import MediaAsset


@override_settings(
    MEDIA_PROVIDER="cloudinary",
    CLOUDINARY_CLOUD_NAME="test-cloud",
    CLOUDINARY_API_KEY="key",
    CLOUDINARY_API_SECRET="secret",
    CLOUDINARY_UPLOAD_PRESET="",
    CLOUDINARY_FOLDER="uploads",
)
class MediaUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create(
            phone="+2348011999888",
            role=User.Role.DRIVER,
        )
        tokens = issue_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_upload_requires_auth(self):
        anon = APIClient()
        res = anon.post("/api/v1/media/upload/")
        self.assertEqual(res.status_code, 401)

    def test_upload_rejects_empty(self):
        res = self.client.post("/api/v1/media/upload/", {}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "VALIDATION_ERROR")

    @patch("cloudinary.uploader.upload")
    @patch(
        "core.services.media.cloudinary_delivery_url",
        return_value="https://cdn.example/face.jpg",
    )
    def test_upload_single_image(self, _mock_url, mock_upload):
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/test/image/upload/v1/uploads/face/abc.jpg",
            "public_id": "uploads/face/abc",
            "resource_type": "image",
            "format": "jpg",
            "bytes": 12,
            "width": 10,
            "height": 10,
        }
        upload = SimpleUploadedFile(
            "face.jpg",
            b"\xff\xd8\xff" + b"0" * 20,
            content_type="image/jpeg",
        )
        res = self.client.post(
            "/api/v1/media/upload/?kind=face",
            {"file": upload},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["file"]["url"], "https://cdn.example/face.jpg")
        self.assertEqual(body["file"]["storage_key"], "uploads/face/abc")
        self.assertEqual(body["file"]["provider"], "cloudinary")
        self.assertTrue(body["file"]["id"])
        asset = MediaAsset.objects.get(pk=body["file"]["id"])
        self.assertEqual(asset.uploaded_by_id, self.user.id)
        self.assertEqual(asset.kind, "face")
        kwargs = mock_upload.call_args.kwargs
        self.assertEqual(kwargs["folder"], "uploads/face")
        self.assertEqual(kwargs["resource_type"], "image")

    @patch("cloudinary.uploader.upload")
    @patch(
        "core.services.media.cloudinary_delivery_url",
        return_value="https://cdn.example/doc.pdf",
    )
    def test_upload_multiple_pdfs(self, _mock_url, mock_upload):
        mock_upload.side_effect = [
            {
                "secure_url": "https://res.cloudinary.com/test/raw/upload/v1/uploads/a.pdf",
                "public_id": "uploads/a",
                "resource_type": "raw",
                "format": "pdf",
                "bytes": 4,
            },
            {
                "secure_url": "https://res.cloudinary.com/test/raw/upload/v1/uploads/b.pdf",
                "public_id": "uploads/b",
                "resource_type": "raw",
                "format": "pdf",
                "bytes": 4,
            },
        ]
        files = [
            SimpleUploadedFile("a.pdf", b"%PDF", content_type="application/pdf"),
            SimpleUploadedFile("b.pdf", b"%PDF", content_type="application/pdf"),
        ]
        res = self.client.post(
            "/api/v1/media/upload/",
            {"files": files},
            format="multipart",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["count"], 2)
        self.assertEqual(mock_upload.call_count, 2)
        self.assertEqual(MediaAsset.objects.count(), 2)
