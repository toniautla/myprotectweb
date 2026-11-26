import { Box, Button, ButtonGroup, Flex, Heading, Icon, Image, Text } from "@chakra-ui/react";
import { FaBan, FaBomb, FaBrain, FaList, FaMoneyBill, FaShieldAlt } from "react-icons/fa";
import { useRouter } from "next/router";
import BaseLayout from "../components/BaseLayout";
import { botInviteUrl } from "../lib/publicConfig";

const StarterCard = ({ icon, title, color, children, ...rest }) => {

  return (
    <Box bg="#1c1c1c" cursor="pointer" borderRadius="1.25vw" w="22vw" height="16vw" _hover={{
      transform: "scale(1.05)"
    }} >
      <Image alt="CardIcon" src={`/icons/${icon}.png`} w="3.5vw" height="auto" ml="1.4vw" mr="auto" pt="2vw" {...rest} />
      <Text
        color={color}
        fontSize="2vw"
        pl="1.5vw"
        fontWeight="bold"
        pt=".5vw"
      >
        {title}
      </Text>
      <Text
        pt=".5vw"
        fontSize="1vw"
        color="gray"
        pl="1.5vw"
        maxW="30ch"
        fontWeight="600"
      >
        {children}
      </Text>
    </Box>
  )
}

const FeatureBox = ({ title, isRight, image, children, icon, ...rest }) => {
  return (
    <Flex mt="5vw" direction={{ base: "column", md: "row" }} justifyContent="space-between" alignItems="center" maxW="100vw" mb={5} _hover={{
      transform: "scale(1.01)"
    }} >
      {!isRight && (
        <Box>
          <Icon as={icon} ml="5vw" fontSize="3vw" bg="brand.blue.400" p={3} rounded="md" />
          <Heading fontSize="3vw" pl="5vw">{title}</Heading>
          <Text pl="5vw" maxW="50ch" fontSize="1.5vw" pt="1.5vw" {...rest}>
            {children}
          </Text>
        </Box>
      )}

      <Image
        alt="MyProtect Feature"
        src={`/brand/${image}.png`}
        w="50vw"
        height="auto"
        px="5vw"
        draggable={false}
      />

      {isRight && (
        <Box>
          <Icon as={icon} ml="5vw" fontSize="3vw" bg="brand.blue.400" p={3} rounded="md" />
          <Heading fontSize="3vw" pl="5vw">{title}</Heading>
          <Text pl="5vw" maxW="50ch" fontSize="1.5vw" pt="1.5vw" {...rest}>
            {children}
          </Text>
        </Box>
      )}

    </Flex>
  )
}

export default function Index({ }) {
  const router = useRouter()
  return (
    <BaseLayout pageTitle={"Home"}>
      <Flex direction={{ base: "column-reverse", md: "row" }} justifyContent="space-around" alignItems={"center"} m={{ base: 8, md: 20 }} gap={8}>
        <Box>
          <Heading fontSize={{ base: "4xl", md: "5vw" }}>Meet MyProtect</Heading>
          <Text my={6} fontSize={{ base: "md", md: "1.5vw" }} maxW="40ch" color="gray">The most advanced and easy to use bot to help protect your Discord server.</Text>
          <ButtonGroup spacing={5} flexWrap="wrap">
            <Button
              colorScheme="brand.blue"
              fontSize={{ base: "md", md: "1.1vw" }}
              px={8}
              py={{ base: 6, md: "2vw" }}
              borderRadius="20px"
              onClick={() => window.open(botInviteUrl(), "_blank", "noopener")}
            >
              Add MyProtect
            </Button>

            <Button
              colorScheme="green"
              fontSize={{ base: "md", md: "1.1vw" }}
              px={8}
              py={{ base: 6, md: "2vw" }}
              borderRadius="20px"
              onClick={() => router.push("/dashboard")}
            >
              Open Dashboard
            </Button>
          </ButtonGroup>
        </Box>
        <Image alt="Image 1" src="/brand/image1.png" width={{ base: "70%", md: "40%" }} />
      </Flex>

      <Flex justifyContent="center" gap={"5vw"} alignItems="center">

        <StarterCard icon="smile" title="Easy to use" color="rgb(231, 177, 60)">
          MyProtect requires no setup or anything else. Just add it, done.
        </StarterCard>

        <StarterCard icon="lightBulb" title="Intelligent" color="rgb(148, 92, 246)" w="2vw">
          MyProtect uses AI to identify your server rules and automatically enforce them.
        </StarterCard>

        <StarterCard icon="speedometer" title="Reliable" color="rgb(88, 192, 152)" w="3.5vw">
          MyProtect has fast response times and we always keep checking the uptime.
        </StarterCard>

      </Flex>

      <FeatureBox icon={FaList} title={"Make your own rules"} image={"image2"}>
        Make your rules stand out and look professional with ease. No need to use webhooks or anything, just run /set-rules and get started!
      </FeatureBox>

      <FeatureBox icon={FaBomb} title={"Nuked? No worries."} image={"image3"} isRight>
        MyProtect automatically creates backup for your server. If your server ever gets nuked, you can easily restore everything.
      </FeatureBox>

      <FeatureBox icon={FaMoneyBill} title={"No more free nitro scams"} image={"image4"}>
        With the power of AI, MyProtect is reliable at identifying phishing links! Once detected, MyProtect automatically deletes them.
      </FeatureBox>

      <FeatureBox icon={FaBrain} title={"Powered by Intelligence"} image={"image5"}>
        MyProtect uses AI to identify the channel you are talking in and gives proper warnings. Perfect for keeping your server clean!
      </FeatureBox>

      <FeatureBox icon={FaShieldAlt} title={"Protect your Webhooks"} image={"image6"} isRight>
        MyProtect actively monitors your webhook behaviours and can automatically delete one if it&apos;s used to raid your Community.
      </FeatureBox>

      <FeatureBox icon={FaBan} title={"Stop Server Raids"} image={"image7"}>
        MyProtect will automatically ban anyone who attempts to raid your community, giving you more peace of mind to focus on more important things.
      </FeatureBox>
    </BaseLayout>
  )
}