"""업로드된 이미지를 디스크에 저장한다."""
import uuid
from pathlib import Path


class ImageRepository:
    def __init__(self, image_dir: Path) -> None:
        self.image_dir = image_dir

    def save(self, data: bytes, original_filename: str) -> str:
        """image_dir 기준 상대 경로(파일명)를 반환한다."""
        suffix = Path(original_filename).suffix or ".png"
        filename = f"{uuid.uuid4().hex}{suffix}"
        (self.image_dir / filename).write_bytes(data)
        return filename
