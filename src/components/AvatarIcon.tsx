export default function AvatarIcon({ avatar }: { avatar: string }) {
  if (avatar.endsWith('.png')) {
    return (
      <img
        src={`/${avatar}`}
        alt="avatar"
        style={{
          width: '1em',
          height: '1em',
          objectFit: 'contain',
          verticalAlign: 'middle',
          display: 'inline-block',
        }}
        draggable={false}
      />
    )
  }
  return <>{avatar}</>
}
