// โครงข้อมูลหลักของเกม (ออกแบบให้แมปกับ Firebase RTDB ได้ตรงๆ ในขั้นถัดไป)

export interface Card {
  id: string
  left: string
  right: string
  colorLeft: string
  colorRight: string
}
