
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "Area_Bosses": {
                  Row: {
                    "area_id": number,"level": number,"slot": number,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"level"?: number,"slot": number,"species_id": number
                  }
                  Update: {
                    "area_id"?: number,"level"?: number,"slot"?: number,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Bosses_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Area_Bosses_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Area_Encounters": {
                  Row: {
                    "area_id": number,"id": number,"max_level": number,"min_level": number,"species_id": number,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"id"?: number,"max_level"?: number,"min_level"?: number,"species_id": number,"weight"?: number
                  }
                  Update: {
                    "area_id"?: number,"id"?: number,"max_level"?: number,"min_level"?: number,"species_id"?: number,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Encounters_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Area_Encounters_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Area_Loot": {
                  Row: {
                    "area_id": number,"currency_code": string | null,"id": number,"item_id": number | null,"max_quantity": number,"min_quantity": number,"source": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"currency_code"?: string | null,"id"?: number,"item_id"?: number | null,"max_quantity"?: number,"min_quantity"?: number,"source": string,"weight"?: number
                  }
                  Update: {
                    "area_id"?: number,"currency_code"?: string | null,"id"?: number,"item_id"?: number | null,"max_quantity"?: number,"min_quantity"?: number,"source"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Loot_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Area_Loot_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Area_Loot_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "Items"
      referencedColumns: ["id"]
    }
                  ]
                },"Area_Squares": {
                  Row: {
                    "area_id": number,"chest_rate": number,"choice_rate": number,"item_rate": number,"monster_rate": number,"position": number
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"chest_rate"?: number,"choice_rate"?: number,"item_rate"?: number,"monster_rate"?: number,"position": number
                  }
                  Update: {
                    "area_id"?: number,"chest_rate"?: number,"choice_rate"?: number,"item_rate"?: number,"monster_rate"?: number,"position"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Area_Squares_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    }
                  ]
                },"Areas": {
                  Row: {
                    "clear_amount": number,"clear_currency_code": string,"description": string | null,"id": number,"image_path": string | null,"is_active": boolean,"max_enemies": number,"min_enemies": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "clear_amount"?: number,"clear_currency_code"?: string,"description"?: string | null,"id"?: number,"image_path"?: string | null,"is_active"?: boolean,"max_enemies"?: number,"min_enemies"?: number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "clear_amount"?: number,"clear_currency_code"?: string,"description"?: string | null,"id"?: number,"image_path"?: string | null,"is_active"?: boolean,"max_enemies"?: number,"min_enemies"?: number,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Areas_clear_currency_code_fkey"
      columns: ["clear_currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"Currencies": {
                  Row: {
                    "code": string,"name": string,"short_name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"name": string,"short_name": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"name"?: string,"short_name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"Element_Matchups": {
                  Row: {
                    "attack_element_id": number,"defense_element_id": number,"level": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attack_element_id": number,"defense_element_id": number,"level": string
                  }
                  Update: {
                    "attack_element_id"?: number,"defense_element_id"?: number,"level"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Element_Matchups_attack_element_id_fkey"
      columns: ["attack_element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Element_Matchups_defense_element_id_fkey"
      columns: ["defense_element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Element_Matchups_level_fkey"
      columns: ["level"]
isOneToOne: false
      referencedRelation: "Resistance_Levels"
      referencedColumns: ["code"]
    }
                  ]
                },"Elements": {
                  Row: {
                    "description": string | null,"id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: number,"name": string
                  }
                  Update: {
                    "description"?: string | null,"id"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"Expedition_Loot": {
                  Row: {
                    "currency_code": string | null,"expedition_id": string,"id": number,"item_id": number | null,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "currency_code"?: string | null,"expedition_id": string,"id"?: number,"item_id"?: number | null,"quantity": number
                  }
                  Update: {
                    "currency_code"?: string | null,"expedition_id"?: string,"id"?: number,"item_id"?: number | null,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Expedition_Loot_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Expedition_Loot_expedition_id_fkey"
      columns: ["expedition_id"]
isOneToOne: false
      referencedRelation: "Expeditions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Expedition_Loot_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "Items"
      referencedColumns: ["id"]
    }
                  ]
                },"Expeditions": {
                  Row: {
                    "area_id": number,"ended_at": string | null,"id": string,"log": NonNullable<Json>,"owner_id": string,"position": number,"started_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": number,"ended_at"?: string | null,"id"?: string,"log"?: NonNullable<Json>,"owner_id": string,"position"?: number,"started_at"?: string,"status"?: string
                  }
                  Update: {
                    "area_id"?: number,"ended_at"?: string | null,"id"?: string,"log"?: NonNullable<Json>,"owner_id"?: string,"position"?: number,"started_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Expeditions_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "Areas"
      referencedColumns: ["id"]
    }
                  ]
                },"Items": {
                  Row: {
                    "description": string | null,"effect_type": string,"effect_value": number | null,"id": number,"image_path": string | null,"name": string,"usable_in_battle": boolean,"usable_in_field": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"effect_type"?: string,"effect_value"?: number | null,"id"?: number,"image_path"?: string | null,"name": string,"usable_in_battle"?: boolean,"usable_in_field"?: boolean
                  }
                  Update: {
                    "description"?: string | null,"effect_type"?: string,"effect_value"?: number | null,"id"?: number,"image_path"?: string | null,"name"?: string,"usable_in_battle"?: boolean,"usable_in_field"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"Monster_Species": {
                  Row: {
                    "atk": number | null,"def": number | null,"description": string | null,"element_id": number | null,"hp": number | null,"id": number,"image_path": string | null,"int": number | null,"mp": number | null,"name": string,"rank": string | null,"size": number | null,"skill_1": number | null,"skill_2": number | null,"skill_3": number | null,"skill_4": number | null,"skill_5": number | null,"spd": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "atk"?: number | null,"def"?: number | null,"description"?: string | null,"element_id"?: number | null,"hp"?: number | null,"id"?: number,"image_path"?: string | null,"int"?: number | null,"mp"?: number | null,"name": string,"rank"?: string | null,"size"?: number | null,"skill_1"?: number | null,"skill_2"?: number | null,"skill_3"?: number | null,"skill_4"?: number | null,"skill_5"?: number | null,"spd"?: number | null
                  }
                  Update: {
                    "atk"?: number | null,"def"?: number | null,"description"?: string | null,"element_id"?: number | null,"hp"?: number | null,"id"?: number,"image_path"?: string | null,"int"?: number | null,"mp"?: number | null,"name"?: string,"rank"?: string | null,"size"?: number | null,"skill_1"?: number | null,"skill_2"?: number | null,"skill_3"?: number | null,"skill_4"?: number | null,"skill_5"?: number | null,"spd"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "Monster_Species_element_id_fkey"
      columns: ["element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Monster_Species_rank_fkey"
      columns: ["rank"]
isOneToOne: false
      referencedRelation: "Ranks"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Monster_Species_skill_1_fkey"
      columns: ["skill_1"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Monster_Species_skill_2_fkey"
      columns: ["skill_2"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Monster_Species_skill_3_fkey"
      columns: ["skill_3"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Monster_Species_skill_4_fkey"
      columns: ["skill_4"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Monster_Species_skill_5_fkey"
      columns: ["skill_5"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    }
                  ]
                },"Player_Currencies": {
                  Row: {
                    "amount": number,"currency_code": string,"owner_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number,"currency_code": string,"owner_id": string
                  }
                  Update: {
                    "amount"?: number,"currency_code"?: string,"owner_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "Player_Currencies_currency_code_fkey"
      columns: ["currency_code"]
isOneToOne: false
      referencedRelation: "Currencies"
      referencedColumns: ["code"]
    }
                  ]
                },"Player_Items": {
                  Row: {
                    "item_id": number,"owner_id": string,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "item_id": number,"owner_id": string,"quantity": number
                  }
                  Update: {
                    "item_id"?: number,"owner_id"?: string,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Player_Items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "Items"
      referencedColumns: ["id"]
    }
                  ]
                },"Player_Monsters": {
                  Row: {
                    "alloc_atk": number,"alloc_def": number,"alloc_hp": number,"alloc_int": number,"alloc_mp": number,"alloc_spd": number,"exp": number,"id": string,"in_storage": boolean,"level": number,"level_cap": number,"limit_points": number,"nickname": string | null,"obtained_at": string,"owner_id": string,"party_slot": number | null,"skill_1": number | null,"skill_2": number | null,"skill_3": number | null,"skill_4": number | null,"skill_5": number | null,"source": string | null,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alloc_atk"?: number,"alloc_def"?: number,"alloc_hp"?: number,"alloc_int"?: number,"alloc_mp"?: number,"alloc_spd"?: number,"exp"?: number,"id"?: string,"in_storage"?: boolean,"level"?: number,"level_cap"?: number,"limit_points"?: number,"nickname"?: string | null,"obtained_at"?: string,"owner_id": string,"party_slot"?: number | null,"skill_1"?: number | null,"skill_2"?: number | null,"skill_3"?: number | null,"skill_4"?: number | null,"skill_5"?: number | null,"source"?: string | null,"species_id": number
                  }
                  Update: {
                    "alloc_atk"?: number,"alloc_def"?: number,"alloc_hp"?: number,"alloc_int"?: number,"alloc_mp"?: number,"alloc_spd"?: number,"exp"?: number,"id"?: string,"in_storage"?: boolean,"level"?: number,"level_cap"?: number,"limit_points"?: number,"nickname"?: string | null,"obtained_at"?: string,"owner_id"?: string,"party_slot"?: number | null,"skill_1"?: number | null,"skill_2"?: number | null,"skill_3"?: number | null,"skill_4"?: number | null,"skill_5"?: number | null,"source"?: string | null,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Player_Monsters_skill_1_fkey"
      columns: ["skill_1"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Player_Monsters_skill_2_fkey"
      columns: ["skill_2"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Player_Monsters_skill_3_fkey"
      columns: ["skill_3"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Player_Monsters_skill_4_fkey"
      columns: ["skill_4"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Player_Monsters_skill_5_fkey"
      columns: ["skill_5"]
isOneToOne: false
      referencedRelation: "Skills"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Player_Monsters_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "box_capacity": number,"created_at": string,"display_name": string,"id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "box_capacity"?: number,"created_at"?: string,"display_name": string,"id": string,"updated_at"?: string
                  }
                  Update: {
                    "box_capacity"?: number,"created_at"?: string,"display_name"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"Ranks": {
                  Row: {
                    "code": string,"exp_rate": number,"recruit_rate": number,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"exp_rate": number,"recruit_rate": number,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"exp_rate"?: number,"recruit_rate"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"Resistance_Levels": {
                  Row: {
                    "code": string,"effect": string,"multiplier": number,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"effect"?: string,"multiplier": number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "code"?: string,"effect"?: string,"multiplier"?: number,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"Skills": {
                  Row: {
                    "description": string | null,"element_id": number | null,"id": number,"name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"element_id"?: number | null,"id"?: number,"name"?: string | null
                  }
                  Update: {
                    "description"?: string | null,"element_id"?: number | null,"id"?: number,"name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "Skills_element_id_fkey"
      columns: ["element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    }
                  ]
                },"Species_Element_Resistances": {
                  Row: {
                    "element_id": number,"level": string,"species_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "element_id": number,"level": string,"species_id": number
                  }
                  Update: {
                    "element_id"?: number,"level"?: string,"species_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Species_Element_Resistances_element_id_fkey"
      columns: ["element_id"]
isOneToOne: false
      referencedRelation: "Elements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Species_Element_Resistances_level_fkey"
      columns: ["level"]
isOneToOne: false
      referencedRelation: "Resistance_Levels"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Species_Element_Resistances_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    }
                  ]
                },"Species_Status_Resistances": {
                  Row: {
                    "level": string,"species_id": number,"status_effect_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "level": string,"species_id": number,"status_effect_id": number
                  }
                  Update: {
                    "level"?: string,"species_id"?: number,"status_effect_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "Species_Status_Resistances_level_fkey"
      columns: ["level"]
isOneToOne: false
      referencedRelation: "Resistance_Levels"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "Species_Status_Resistances_species_id_fkey"
      columns: ["species_id"]
isOneToOne: false
      referencedRelation: "Monster_Species"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "Species_Status_Resistances_status_effect_id_fkey"
      columns: ["status_effect_id"]
isOneToOne: false
      referencedRelation: "Status_Effects"
      referencedColumns: ["id"]
    }
                  ]
                },"Status_Effects": {
                  Row: {
                    "description": string | null,"id": number,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: number,"name": string
                  }
                  Update: {
                    "description"?: string | null,"id"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "allocate_limit_point":
{ Args: { "p_monster_id": string,"p_stat": string }; Returns: number
                           },
"commit_expedition_step":
{ Args: { "p_advance": boolean,"p_event": Json,"p_expected_position": number,"p_expedition_id": string,"p_finish"?: string,"p_loot"?: Json,"p_recruit"?: Json }; Returns: Json
                           },
"consume_item":
{ Args: { "p_item_id": number,"p_owner_id": string,"p_quantity"?: number }; Returns: number
                           },
"element_resistance":
{ Args: { "p_attack_element_id": number,"p_species_id": number }; Returns: string
                           },
"exp_to_next":
{ Args: { "p_level": number,"p_rank": string }; Returns: number
                           },
"grant_currency":
{ Args: { "p_amount": number,"p_currency_code": string,"p_owner_id": string }; Returns: number
                           },
"grant_exp":
{ Args: { "p_amount": number,"p_monster_id": string }; Returns: number
                           },
"grant_item":
{ Args: { "p_item_id": number,"p_owner_id": string,"p_quantity"?: number }; Returns: number
                           },
"grant_monster":
{ Args: { "p_level"?: number,"p_owner_id": string,"p_source"?: string,"p_species_id": number }; Returns: {
              "in_storage": boolean,"monster_id": string
            }[]
                           },
"move_monster":
{ Args: { "p_monster_id": string,"p_target_slot": number }; Returns: undefined
                           },
"rank_exp_rate":
{ Args: { "p_rank": string }; Returns: number
                           },
"release_monster":
{ Args: { "p_monster_id": string }; Returns: undefined
                           },
"spend_currency":
{ Args: { "p_amount": number,"p_currency_code": string,"p_owner_id": string }; Returns: number
                           },
"status_resistance":
{ Args: { "p_species_id": number,"p_status_effect_id": number }; Returns: string
                           },
"use_field_item":
{ Args: { "p_item_id": number }; Returns: undefined
                           },
"withdraw_from_storage":
{ Args: { "p_monster_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
