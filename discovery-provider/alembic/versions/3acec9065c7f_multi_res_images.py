"""multi-res-images

Revision ID: 3acec9065c7f
Revises: b2bbb6eb724f
Create Date: 2019-08-23 13:29:46.990355

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "3acec9065c7f"
down_revision = "b2bbb6eb724f"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "playlists",
        sa.Column("playlist_image_sizes_multihash", sa.String(), nullable=True),
    )
    op.add_column("tracks", sa.Column("cover_art_sizes", sa.String(), nullable=True))
    op.add_column("users", sa.Column("cover_photo_sizes", sa.String(), nullable=True))
    op.add_column(
        "users", sa.Column("profile_picture_sizes", sa.String(), nullable=True)
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("users", "profile_picture_sizes")
    op.drop_column("users", "cover_photo_sizes")
    op.drop_column("tracks", "cover_art_sizes")
    op.drop_column("playlists", "playlist_image_sizes_multihash")
    # ### end Alembic commands ###
