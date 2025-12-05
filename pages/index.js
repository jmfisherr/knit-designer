import dynamic from 'next/dynamic'
import Head from 'next/head'

const GridDesigner = dynamic(() => import('../components/GridDesigner'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>Knit Designer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <GridDesigner />
    </>
  )
}
